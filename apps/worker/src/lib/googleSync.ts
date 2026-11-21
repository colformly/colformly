import { getValidGoogleAccessToken } from './googleAuth';
import type { TelemetryEnv } from '../services/telemetry';
import { reportSystemIncidentAsync } from '../services/telemetry';

export interface SyncGoogleFormResult {
  success: boolean;
  googleFormId: string;
  driveFolderId: string;
  formResponderUrl: string;
  responsesEditUrl: string;
  linkedSheetId?: string | null;
  entryMap: Record<string, string>;
}

/**
 * Parses Google Form public viewform HTML payload (FB_PUBLIC_LOAD_DATA_)
 * to extract exact entry.<id> field IDs for background forwarding.
 */
function parseViewFormEntryMap(
  html: string,
  questionBlocks: Array<{ id: string; content: string }>,
): { studentEmailEntry?: string; questionEntryMap: Record<string, string> } {
  const result: { studentEmailEntry?: string; questionEntryMap: Record<string, string> } = {
    questionEntryMap: {},
  };

  try {
    const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);\s*<\/script>/s);
    if (!match || !match[1]) return result;

    const payload = JSON.parse(match[1]);
    const items = payload?.[1]?.[1];
    if (!Array.isArray(items)) return result;

    let questionIdx = 0;

    for (const item of items) {
      const title = String(item[1] || '').trim();
      const questionData = item[4]?.[0];
      const entryIdNum = questionData?.[0];

      if (!entryIdNum) continue;
      const entryField = `entry.${entryIdNum}`;

      if (title.toLowerCase().includes('student verified email')) {
        result.studentEmailEntry = entryField;
      } else {
        // Match question by title or by order
        const matchedBlock = questionBlocks.find((b) => b.content.trim() === title);
        if (matchedBlock) {
          result.questionEntryMap[matchedBlock.id] = entryField;
        } else if (questionBlocks[questionIdx]) {
          result.questionEntryMap[questionBlocks[questionIdx].id] = entryField;
          questionIdx++;
        }
      }
    }
  } catch (err) {
    console.warn('Could not parse FB_PUBLIC_LOAD_DATA_ from viewform HTML:', err);
  }

  return result;
}

/**
 * 1. Synchronize Test with Google Drive & Google Forms.
 * - Creates/reuses Colformly Drive folder hierarchy (using drive.file scope)
 * - Creates/updates Google Form (using forms.body scope)
 * - Extracts entry.<id> map from responder URI
 */
export async function syncTestToGoogleForm(
  testId: string,
  userId: string,
  env: any,
  supabaseAdmin: { supabaseUrl: string; secretKey: string },
): Promise<SyncGoogleFormResult> {
  const { supabaseUrl, secretKey } = supabaseAdmin;

  // 1. Fetch test row from public.tests
  const testRes = await fetch(
    `${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(testId)}&select=id,org_id,course_id,title,blocks,drive_folder_id,google_form_id,linked_sheet_id,form_responder_url,form_entry_map`,
    {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
    },
  );

  if (!testRes.ok) {
    throw new Error('Test not found in database.');
  }

  const tests = (await testRes.json().catch(() => [])) as any[];
  const test = tests[0];
  if (!test) throw new Error('Test not found.');

  // 2. Obtain fresh Google Access Token
  const { accessToken } = await getValidGoogleAccessToken(userId, env, supabaseAdmin);

  // 3. Resolve Course name for folder naming
  let courseSection = 'General Assessments';
  if (test.course_id) {
    const courseRes = await fetch(
      `${supabaseUrl}/rest/v1/courses?id=eq.${encodeURIComponent(test.course_id)}&select=name,code,section`,
      {
        headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
      },
    );
    if (courseRes.ok) {
      const courses = (await courseRes.json().catch(() => [])) as any[];
      if (courses[0]) {
        const c = courses[0];
        courseSection = `${c.code || c.name || 'Course'} Sec-${c.section || 'A'}`;
      }
    }
  }

  // 4. Drive Folder Hierarchy (drive.file scope): Colformly / <Course-Section> / <YYYY-MM-DD - Test Title>
  let driveFolderId = test.drive_folder_id;

  if (!driveFolderId) {
    // 4a. Find or create root 'Colformly' folder
    const rootSearch = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='Colformly' and trashed=false&fields=files(id, name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const rootData = (await rootSearch.json().catch(() => ({}))) as { files?: Array<{ id: string }> };
    let rootFolderId = rootData.files?.[0]?.id;

    if (!rootFolderId) {
      const createRootRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Colformly',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      const createdRoot = (await createRootRes.json()) as { id: string };
      rootFolderId = createdRoot.id;
    }

    // 4b. Find or create Course Section folder inside Colformly
    const courseSearch = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${encodeURIComponent(courseSection)}' and '${rootFolderId}' in parents and trashed=false&fields=files(id, name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const courseData = (await courseSearch.json().catch(() => ({}))) as { files?: Array<{ id: string }> };
    let courseFolderId = courseData.files?.[0]?.id;

    if (!courseFolderId) {
      const createCourseRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: courseSection,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      });
      const createdCourse = (await createCourseRes.json()) as { id: string };
      courseFolderId = createdCourse.id;
    }

    // 4c. Create Test Assessment folder
    const dateStr = new Date().toISOString().slice(0, 10);
    const testFolderName = `${dateStr} - ${test.title}`;

    const createTestFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: testFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [courseFolderId],
      }),
    });
    const createdTestFolder = (await createTestFolderRes.json()) as { id: string };
    driveFolderId = createdTestFolder.id;
  }

  // 5. Google Form Creation / Update (forms.body scope)
  let googleFormId = test.google_form_id;
  let responderUri = '';

  const blocks: any[] = Array.isArray(test.blocks) ? test.blocks : [];
  const questionBlocks = blocks.filter(
    (b: any) => b.type === 'mcq' || b.type === 'short_answer',
  );

  if (!googleFormId) {
    // 5a. Create new Google Form
    const createFormRes = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        info: {
          title: test.title,
          documentTitle: test.title,
        },
      }),
    });

    if (!createFormRes.ok) {
      const errText = await createFormRes.text();
      throw new Error(`Failed to create Google Form: ${errText}`);
    }

    const formData = (await createFormRes.json()) as { formId: string; responderUri: string };
    googleFormId = formData.formId;
    responderUri = formData.responderUri || '';

    // Move form into Drive folder
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${googleFormId}?addParents=${driveFolderId}&enforceSingleParent=true`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ).catch(() => null);

    // Build question creation requests
    const requests: any[] = [];

    // Question 0: Student Verified Email (Required)
    requests.push({
      createItem: {
        item: {
          title: 'Student Verified Email',
          description: 'Auto-verified and recorded by Colformly student authentication.',
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: false },
            },
          },
        },
        location: { index: 0 },
      },
    });

    // Subsequent questions from blocks
    questionBlocks.forEach((b: any, idx: number) => {
      if (b.type === 'mcq') {
        const options = Array.isArray(b.options)
          ? b.options.map((opt: string) => ({ value: String(opt) }))
          : [{ value: 'Option A' }, { value: 'Option B' }];

        requests.push({
          createItem: {
            item: {
              title: b.content || `Question ${idx + 1}`,
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options,
                    shuffle: false,
                  },
                },
              },
            },
            location: { index: idx + 1 },
          },
        });
      } else {
        requests.push({
          createItem: {
            item: {
              title: b.content || `Question ${idx + 1}`,
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: true },
                },
              },
            },
            location: { index: idx + 1 },
          },
        });
      }
    });

    if (requests.length > 0) {
      const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${googleFormId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        console.warn('Batch update Google Form questions warning:', errText);
      }
    }
  }

  // 6. Fetch Google Form metadata to retrieve responderUri
  const getFormRes = await fetch(`https://forms.googleapis.com/v1/forms/${googleFormId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let linkedSheetId = test.linked_sheet_id;
  if (getFormRes.ok) {
    const freshFormData = (await getFormRes.json()) as { responderUri?: string; linkedSheetId?: string };
    if (freshFormData.responderUri) {
      responderUri = freshFormData.responderUri;
    }
    if (freshFormData.linkedSheetId) {
      linkedSheetId = freshFormData.linkedSheetId;
    }
  }

  // 7. Extract entry.<id> map from public viewform HTML
  const entryMap: Record<string, string> = { ...(test.form_entry_map || {}) };
  let formResponderUrl = test.form_responder_url;

  if (responderUri) {
    formResponderUrl = responderUri.replace(/\/viewform(\?.*)?$/, '/formResponse');

    try {
      const viewformHtml = await fetch(responderUri).then((r) => r.text());
      const parsed = parseViewFormEntryMap(viewformHtml, questionBlocks);

      if (parsed.studentEmailEntry) {
        entryMap._student_email = parsed.studentEmailEntry;
      }
      Object.entries(parsed.questionEntryMap).forEach(([qId, entryId]) => {
        entryMap[qId] = entryId;
      });
    } catch (parseErr) {
      console.warn('Error extracting viewform entry map:', parseErr);
    }
  }

  // 8. Update public.tests with Google metadata
  await fetch(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(testId)}`, {
    method: 'PATCH',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      drive_folder_id: driveFolderId,
      google_form_id: googleFormId,
      form_responder_url: formResponderUrl,
      form_entry_map: entryMap,
      ...(linkedSheetId ? { linked_sheet_id: linkedSheetId } : {}),
    }),
  });

  return {
    success: true,
    googleFormId,
    driveFolderId,
    formResponderUrl: formResponderUrl || '',
    responsesEditUrl: `https://docs.google.com/forms/d/${googleFormId}/edit#responses`,
    linkedSheetId,
    entryMap,
  };
}

/**
 * 2. Native Sheet Link Verification.
 * Reads forms.get({ formId }) to inspect linkedSheetId.
 */
export async function verifyTestSheetLink(
  testId: string,
  userId: string,
  env: any,
  supabaseAdmin: { supabaseUrl: string; secretKey: string },
): Promise<{ verified: boolean; linkedSheetId?: string; responsesEditUrl?: string; message: string }> {
  const { supabaseUrl, secretKey } = supabaseAdmin;

  const testRes = await fetch(
    `${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(testId)}&select=id,google_form_id,linked_sheet_id`,
    {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
    },
  );

  const tests = (await testRes.json().catch(() => [])) as any[];
  const test = tests[0];
  if (!test) throw new Error('Test not found.');

  if (!test.google_form_id) {
    return {
      verified: false,
      message: 'Google Form has not been created for this test yet. Complete Step 1 first.',
    };
  }

  const { accessToken } = await getValidGoogleAccessToken(userId, env, supabaseAdmin);

  const formRes = await fetch(`https://forms.googleapis.com/v1/forms/${test.google_form_id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!formRes.ok) {
    const errText = await formRes.text();
    throw new Error(`Failed to query Google Form details: ${errText}`);
  }

  const formData = (await formRes.json()) as { linkedSheetId?: string };

  if (formData.linkedSheetId) {
    // Save verified linkedSheetId to public.tests
    await fetch(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(testId)}`, {
      method: 'PATCH',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linked_sheet_id: formData.linkedSheetId,
        sheet_verified_at: new Date().toISOString(),
      }),
    });

    return {
      verified: true,
      linkedSheetId: formData.linkedSheetId,
      message: 'Linked Google Sheet verified successfully! Publishing unlocked.',
    };
  }

  return {
    verified: false,
    responsesEditUrl: `https://docs.google.com/forms/d/${test.google_form_id}/edit#responses`,
    message: "Sheet not linked yet. Click 'Link to Sheets' in the Google Forms Responses tab.",
  };
}

/**
 * 3. Zero-Limit Background Forwarding to Google Form.
 * Submits student answers directly to the Google Form response endpoint (0 Google Sheets API calls).
 */
export async function forwardSubmissionToGoogleFormAsync(
  telemetryEnv: TelemetryEnv,
  params: {
    testId: string;
    studentEmail: string;
    answers: Record<string, string>;
  },
): Promise<void> {
  const supabaseUrl = telemetryEnv.SUPABASE_URL.replace(/\/$/, '');
  const secretKey =
    telemetryEnv.SUPABASE_SECRET_KEY ||
    telemetryEnv.SUPABASE_SERVICE_ROLE_KEY ||
    telemetryEnv.SUPABASE_PUBLISHABLE_KEY ||
    '';

  try {
    const testRes = await fetch(
      `${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(params.testId)}&select=org_id,form_responder_url,form_entry_map`,
      {
        headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
      },
    );

    if (!testRes.ok) return;

    const tests = (await testRes.json().catch(() => [])) as any[];
    const test = tests[0];
    if (!test || !test.form_responder_url || !test.form_entry_map) return;

    const entryMap = test.form_entry_map as Record<string, string>;
    const bodyParams = new URLSearchParams();

    // 1. Student Verified Email
    if (entryMap._student_email) {
      bodyParams.append(entryMap._student_email, params.studentEmail);
    }

    // 2. Each question response
    Object.entries(params.answers || {}).forEach(([questionId, answer]) => {
      const entryKey = entryMap[questionId];
      if (entryKey) {
        bodyParams.append(entryKey, String(answer || ''));
      }
    });

    // 3. Post directly to Google Form formResponse endpoint
    const formRes = await fetch(test.form_responder_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Colformly-Worker-Sync/2.0',
      },
      body: bodyParams.toString(),
    });

    if (!formRes.ok && formRes.status !== 200 && formRes.status !== 302) {
      await reportSystemIncidentAsync(telemetryEnv, {
        severity: 'WARNING',
        category: 'AUTH_SECURITY',
        orgId: test.org_id,
        message: `Google Form background forwarding returned HTTP ${formRes.status} for test ${params.testId}`,
        payload: {
          testId: params.testId,
          studentEmail: params.studentEmail,
          status: formRes.status,
          statusText: formRes.statusText,
        },
      });
    }
  } catch (err: any) {
    console.warn('Background Google Form forward incident:', err);
    await reportSystemIncidentAsync(telemetryEnv, {
      severity: 'WARNING',
      category: 'AUTH_SECURITY',
      message: `Google Form submission exception: ${err.message}`,
      payload: {
        testId: params.testId,
        studentEmail: params.studentEmail,
        error: String(err),
      },
    });
  }
}
