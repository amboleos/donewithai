#!/bin/bash

# E2E Test Script for AI Jobs Report and Manual AI Toggle
# This script tests:
# 1. AI Jobs Report (Task 31)
# 2. Manual AI Toggle - Commit (Task 42)
# 3. Manual AI Toggle - Branch (Task 46)

set -e

BASE_URL="http://localhost:3000"
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzQxMDk3NTQsImV4cCI6MTc3NDcxNDU1NH0.TNnnVHdMb58E3Ap8NjZ-o0ju3GhCR24iUZVIqWo0BXc"
OUTPUT_FILE="/home/batur/Projects/donewithai/test-results/ai-jobs-toggle.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "====================================="
echo "E2E Test: AI Jobs Report & Toggle"
echo "====================================="

# Initialize JSON output
cat > "$OUTPUT_FILE" << 'EOF'
{
  "testName": "AI Jobs Report and Manual Toggle E2E Test",
  "timestamp": null,
  "tests": []
}
EOF

# Helper function to make API calls and capture results
api_call() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local token="$4"

  if [ -z "$token" ]; then
    token="$ADMIN_TOKEN"
  fi

  if [ "$method" = "GET" ]; then
    curl -s -X GET "$BASE_URL$endpoint" -H "Authorization: Bearer $token"
  else
    curl -s -X POST "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# Helper to add test result
add_test_result() {
  local test_name="$1"
  local status="$2"
  local details="$3"
  local response="$4"

  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  temp=$(mktemp)
  jq --arg name "$test_name" \
     --arg status "$status" \
     --arg details "$details" \
     --arg response "$response" \
     --arg ts "$timestamp" \
     '.tests += [{"name": $name, "status": $status, "details": $details, "response": $response, "timestamp": $ts}]' "$OUTPUT_FILE" > "$temp"
  mv "$temp" "$OUTPUT_FILE"

  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓${NC} $test_name"
  elif [ "$status" = "SKIP" ]; then
    echo -e "${YELLOW}○${NC} $test_name"
  else
    echo -e "${RED}✗${NC} $test_name: $details"
  fi
}

echo ""
echo "Step 1: Verify test data"
echo "-----------------------------------"

# Check commits
COMMITS_RESPONSE=$(api_call "GET" "/api/repos/1/commits")
COMMIT_ID=$(echo "$COMMITS_RESPONSE" | jq -r '.commits[0].id // empty')
COMMIT_COUNT=$(echo "$COMMITS_RESPONSE" | jq -r '.commits | length')
echo "Found $COMMIT_COUNT commits"

# Check branches
BRANCHES_RESPONSE=$(api_call "GET" "/api/repos/1/branches")
BRANCH_ID=$(echo "$BRANCHES_RESPONSE" | jq -r '.branches[0].id // empty')
BRANCH_COUNT=$(echo "$BRANCHES_RESPONSE" | jq -r '.branches | length')
echo "Found $BRANCH_COUNT branches"

if [ -z "$COMMIT_ID" ] || [ "$COMMIT_ID" = "null" ]; then
  echo "ERROR: No test commits found. Cannot proceed with toggle tests."
  exit 1
fi

echo ""
echo "Step 2: AI Jobs Report (Task 31)"
echo "-----------------------------------"

# Test 2.1: Get AI jobs report for Q1 2026
echo "Testing: Get AI jobs report for 2026-Q1"
REPORT_RESPONSE=$(api_call "GET" "/api/ai/jobs?period=2026-Q1&report=true")
echo "Response: $REPORT_RESPONSE"

if echo "$REPORT_RESPONSE" | jq -e '.summary != null' > /dev/null 2>&1; then
  TOTAL_JOBS=$(echo "$REPORT_RESPONSE" | jq -r '.summary.total_jobs // 0')
  TOTAL_POINTS=$(echo "$REPORT_RESPONSE" | jq -r '.summary.total_points // 0')
  TOTAL_DEVS=$(echo "$REPORT_RESPONSE" | jq -r '.summary.total_developers // 0')
  add_test_result "AI Jobs Report - Q1 2026" "PASS" "total_jobs=$TOTAL_JOBS, total_points=$TOTAL_POINTS, total_developers=$TOTAL_DEVS" "$REPORT_RESPONSE"
else
  add_test_result "AI Jobs Report - Q1 2026" "FAIL" "Invalid report format" "$REPORT_RESPONSE"
fi

# Test 2.2: Filter by repo_id
echo "Testing: Filter AI jobs by repo_id"
REPO_JOBS_RESPONSE=$(api_call "GET" "/api/ai/jobs?repoId=1")
echo "Response: $REPO_JOBS_RESPONSE"

if echo "$REPO_JOBS_RESPONSE" | jq -e '.jobs != null' > /dev/null 2>&1; then
  JOB_COUNT=$(echo "$REPO_JOBS_RESPONSE" | jq -r '.jobs | length')
  add_test_result "AI Jobs Filter - By Repo" "PASS" "Found $JOB_COUNT jobs for repo 1" "$REPO_JOBS_RESPONSE"
else
  add_test_result "AI Jobs Filter - By Repo" "FAIL" "Invalid response format" "$REPO_JOBS_RESPONSE"
fi

# Test 2.3: Filter by user_id
echo "Testing: Filter AI jobs by user_id"
USER_JOBS_RESPONSE=$(api_call "GET" "/api/ai/jobs?userId=1")
echo "Response: $USER_JOBS_RESPONSE"

if echo "$USER_JOBS_RESPONSE" | jq -e '.jobs != null' > /dev/null 2>&1; then
  add_test_result "AI Jobs Filter - By User" "PASS" "User filter works" "$USER_JOBS_RESPONSE"
else
  add_test_result "AI Jobs Filter - By User" "FAIL" "Invalid response format" "$USER_JOBS_RESPONSE"
fi

# Test 2.4: Get job details (without report=true)
echo "Testing: Get job details list"
JOBS_LIST_RESPONSE=$(api_call "GET" "/api/ai/jobs")
echo "Response: $JOBS_LIST_RESPONSE"

if echo "$JOBS_LIST_RESPONSE" | jq -e '.jobs != null' > /dev/null 2>&1; then
  add_test_result "AI Jobs List - All Jobs" "PASS" "Retrieved job list successfully" "$JOBS_LIST_RESPONSE"
else
  add_test_result "AI Jobs List - All Jobs" "FAIL" "Invalid response format" "$JOBS_LIST_RESPONSE"
fi

echo ""
echo "Step 3: Manual AI Toggle - Commit (Task 42)"
echo "-----------------------------------"

echo "Using commit ID: $COMMIT_ID"

# Test toggling AI flag on
echo "Testing: Toggle commit AI flag to true"
TOGGLE_ON_RESPONSE=$(api_call "POST" "/api/ai-toggle" "{\"type\":\"commit\",\"id\":$COMMIT_ID,\"isAi\":true}")

if echo "$TOGGLE_ON_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  add_test_result "Commit AI Toggle - ON" "PASS" "Successfully toggled AI flag on commit $COMMIT_ID" "$TOGGLE_ON_RESPONSE"

  # Verify ai_job was created
  sleep 1
  AI_JOBS_AFTER=$(api_call "GET" "/api/ai/jobs")
  JOB_EXISTS=$(echo "$AI_JOBS_AFTER" | jq -r ".jobs[] | select(.source_type==\"commit\" and .source_id==$COMMIT_ID and .detection_method==\"manual\") | .id // empty")

  if [ -n "$JOB_EXISTS" ]; then
    JOB_POINTS=$(echo "$AI_JOBS_AFTER" | jq -r ".jobs[] | select(.source_type==\"commit\" and .source_id==$COMMIT_ID) | .points")
    add_test_result "Commit AI Job Created" "PASS" "AI job created with detection_method='manual', points=$JOB_POINTS" "$AI_JOBS_AFTER"
  else
    add_test_result "Commit AI Job Created" "FAIL" "AI job not found after toggle" "$AI_JOBS_AFTER"
  fi

  # Test toggling back to false
  echo "Testing: Toggle commit AI flag to false"
  TOGGLE_OFF_RESPONSE=$(api_call "POST" "/api/ai-toggle" "{\"type\":\"commit\",\"id\":$COMMIT_ID,\"isAi\":false}")

  if echo "$TOGGLE_OFF_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    add_test_result "Commit AI Toggle - OFF" "PASS" "Successfully toggled AI flag off" "$TOGGLE_OFF_RESPONSE"
  else
    add_test_result "Commit AI Toggle - OFF" "FAIL" "Failed to toggle AI flag off" "$TOGGLE_OFF_RESPONSE"
  fi
else
  add_test_result "Commit AI Toggle - ON" "FAIL" "Failed to toggle AI flag: $TOGGLE_ON_RESPONSE" "$TOGGLE_ON_RESPONSE"
fi

echo ""
echo "Step 4: Manual AI Toggle - Branch (Task 46)"
echo "-----------------------------------"

if [ -z "$BRANCH_ID" ] || [ "$BRANCH_ID" = "null" ]; then
  echo "No branches available. Skipping branch tests."
  add_test_result "Manual AI Toggle - Branch" "SKIP" "No branches available for testing." "No branches found"
else
  echo "Using branch ID: $BRANCH_ID"

  # Test toggling AI flag on branch
  echo "Testing: Toggle branch AI flag to true"
  TOGGLE_BRANCH_ON_RESPONSE=$(api_call "POST" "/api/ai-toggle" "{\"type\":\"branch\",\"id\":$BRANCH_ID,\"isAi\":true}")

  if echo "$TOGGLE_BRANCH_ON_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    add_test_result "Branch AI Toggle - ON" "PASS" "Successfully toggled AI flag on branch $BRANCH_ID" "$TOGGLE_BRANCH_ON_RESPONSE"

    # Verify ai_job was created with branch source_type
    sleep 1
    AI_JOBS_BRANCH=$(api_call "GET" "/api/ai/jobs")
    BRANCH_JOB=$(echo "$AI_JOBS_BRANCH" | jq -r ".jobs[] | select(.source_type==\"branch\" and .source_id==$BRANCH_ID and .detection_method==\"manual\") | .id // empty")

    if [ -n "$BRANCH_JOB" ]; then
      BRANCH_POINTS=$(echo "$AI_JOBS_BRANCH" | jq -r ".jobs[] | select(.source_type==\"branch\" and .source_id==$BRANCH_ID) | .points")
      add_test_result "Branch AI Job Created" "PASS" "AI job created with source_type='branch', detection_method='manual', points=$BRANCH_POINTS" "$AI_JOBS_BRANCH"

      # Check that commits are aggregated into single job
      BRANCH_JOB_COUNT=$(echo "$AI_JOBS_BRANCH" | jq "[.jobs[] | select(.source_type==\"branch\" and .source_id==$BRANCH_ID)] | length")
      if [ "$BRANCH_JOB_COUNT" -eq 1 ]; then
        add_test_result "Branch Aggregation" "PASS" "Branch toggle creates single aggregated AI job (not multiple per commit)" "$AI_JOBS_BRANCH"
      else
        add_test_result "Branch Aggregation" "FAIL" "Expected 1 aggregated job, found $BRANCH_JOB_COUNT" "$AI_JOBS_BRANCH"
      fi
    else
      add_test_result "Branch AI Job Created" "FAIL" "Branch AI job not found after toggle" "$AI_JOBS_BRANCH"
    fi
  else
    add_test_result "Branch AI Toggle - ON" "FAIL" "Failed to toggle AI flag: $TOGGLE_BRANCH_ON_RESPONSE" "$TOGGLE_BRANCH_ON_RESPONSE"
  fi
fi

echo ""
echo "Step 5: Summary Report"
echo "-----------------------------------"

# Update timestamp
temp=$(mktemp)
jq --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" '.timestamp = $ts' "$OUTPUT_FILE" > "$temp"
mv "$temp" "$OUTPUT_FILE"

# Count passed/failed/skipped tests
TOTAL=$(jq '.tests | length' "$OUTPUT_FILE")
PASSED=$(jq '[.tests[].status | select(.=="PASS")] | length' "$OUTPUT_FILE")
FAILED=$(jq '[.tests[].status | select(.=="FAIL")] | length' "$OUTPUT_FILE")
SKIPPED=$(jq '[.tests[].status | select(.=="SKIP")] | length' "$OUTPUT_FILE")

echo "Test Results:"
echo "  Total:   $TOTAL"
echo "  Passed:  $PASSED"
echo "  Failed:  $FAILED"
echo "  Skipped: $SKIPPED"
echo ""
echo "Results saved to: $OUTPUT_FILE"

# Display final JSON
echo ""
echo "Final Report:"
jq '.' "$OUTPUT_FILE"

# Exit with number of failed tests
exit $FAILED
