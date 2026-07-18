const axios = require("axios");

// Mock Data
const TEST_FILE_NAME = `test_s3_sanity_${Date.now()}.txt`;
const TEST_FILE_CONTENT = `AWS S3 Connection Test Content - generated at ${new Date().toISOString()}`;
const TEST_FILE_TYPE = "text/plain";

const results = [];

function recordResult(title, status, comments = "") {
  results.push({ title, status, comments });
  const symbol = status === "PASSED" ? "✓" : "✗";
  console.log(`[${status}] ${symbol} ${title}`);
  if (comments) console.log(`   Info: ${comments}`);
}

async function runS3Tests() {
  console.log("====================================================");
  console.log(" Starting AWS S3 Bucket Connectivity Test           ");
  console.log("====================================================\n");

  let uploadUrl = "";
  let fileKey = "";

  // --- STEP 1: Generate S3 Presigned Upload URL ---
  try {
    const response = await axios.post(
      "https://au6zjukrzlky36hgjsy73aiwae0jzvfu.lambda-url.ap-south-1.on.aws/",
      {
        fileName: TEST_FILE_NAME,
        fileType: TEST_FILE_TYPE,
      }
    );

    uploadUrl = response.data.uploadUrl || response.data.url;
    fileKey = response.data.key;

    if (!uploadUrl || !fileKey) {
      throw new Error("Lambda response did not contain uploadUrl or key");
    }

    recordResult(
      "Generate S3 Presigned Upload URL (Upload Lambda Proxy)",
      "PASSED",
      `Received key: ${fileKey}`
    );
  } catch (error) {
    recordResult(
      "Generate S3 Presigned Upload URL (Upload Lambda Proxy)",
      "FAILED",
      `Request failed: ${error.message}`
    );
    process.exit(1);
  }

  // --- STEP 2: Upload File to S3 ---
  try {
    await axios.put(uploadUrl, TEST_FILE_CONTENT, {
      headers: {
        "Content-Type": TEST_FILE_TYPE,
      },
    });
    recordResult(
      "Upload File to S3 Bucket (Direct PUT)",
      "PASSED",
      "Successfully uploaded test content to the S3 bucket using the presigned URL."
    );
  } catch (error) {
    recordResult(
      "Upload File to S3 Bucket (Direct PUT)",
      "FAILED",
      `PUT request to S3 failed: ${error.message}`
    );
    process.exit(1);
  }

  // --- STEP 3: Generate S3 View URL ---
  let downloadUrl = "";
  try {
    const response = await axios.post(
      "https://b24uxf3gwloquyts6lvh55uoue0vawvl.lambda-url.ap-south-1.on.aws/",
      {
        key: fileKey,
        fileKey: fileKey,
        fileName: fileKey,
        credentialKey: fileKey,
      }
    );

    downloadUrl = typeof response.data === "string" 
      ? response.data 
      : (response.data.viewUrl || response.data.url || response.data.downloadUrl || response.data.presignedUrl);

    if (!downloadUrl) {
      throw new Error("S3 View Lambda did not return a valid URL");
    }

    recordResult(
      "Generate S3 Presigned View URL (View Lambda Proxy)",
      "PASSED",
      `Received view URL: ${downloadUrl.substring(0, 80)}...`
    );
  } catch (error) {
    recordResult(
      "Generate S3 Presigned View URL (View Lambda Proxy)",
      "FAILED",
      `Failed to retrieve view URL: ${error.message}`
    );
    process.exit(1);
  }

  // --- STEP 4: Download and Verify File Contents from S3 ---
  try {
    const response = await axios.get(downloadUrl);
    const fileContent = response.data;
    if (fileContent.trim() === TEST_FILE_CONTENT.trim()) {
      recordResult(
        "Download and Verify S3 File Content",
        "PASSED",
        "Downloaded content matches the originally uploaded content perfectly!"
      );
    } else {
      throw new Error(`Content mismatch. Expected: "${TEST_FILE_CONTENT}", Got: "${fileContent}"`);
    }
  } catch (error) {
    recordResult(
      "Download and Verify S3 File Content",
      "FAILED",
      `Content download verification failed: ${error.message}`
    );
    process.exit(1);
  }

  console.log("\n====================================================");
  console.log(" AWS S3 Connectivity Tests Complete. All Passed!     ");
  console.log("====================================================\n");
}

runS3Tests();
