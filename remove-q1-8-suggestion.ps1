$content = Get-Content 'src/services/ai/conversationalQuestionsStep1.js' -Raw

# Remove the generateSuggestion function from Q1-8 (lines 459-481)
$pattern = ',\s*generateSuggestion:\s*\(answers\)\s*=>\s*\{[^\}]*?const businessType = answers\[''Q1-1''\];[^\}]*?\}\s*\}'

$newContent = $content -replace $pattern, ''

$newContent | Set-Content 'src/services/ai/conversationalQuestionsStep1.js' -NoNewline
