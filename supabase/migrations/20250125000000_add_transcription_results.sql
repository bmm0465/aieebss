-- Add transcription_results column to test_results table
-- This column stores transcription results from all 4 APIs (OpenAI, Gemini, AWS, Azure)

ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS transcription_results JSONB;

-- Add index for JSONB queries (optional, but can help with performance)
CREATE INDEX IF NOT EXISTS idx_test_results_transcription_results 
ON test_results USING GIN (transcription_results);

-- Add comment for documentation
COMMENT ON COLUMN test_results.transcription_results IS 'Stores transcription results from multiple APIs: {openai: {...}, gemini: {...}, aws: {...}, azure: {...}}';

