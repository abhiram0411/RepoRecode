$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $taskRoot 'artifacts\RepoRecode-development-report.docx'
$targetPath = Join-Path $taskRoot 'artifacts\RepoRecode-development-report.pdf'
$wordApp = $null
$reportDocument = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $reportDocument = $wordApp.Documents.Open($sourcePath, $false, $true)
    $reportDocument.ExportAsFixedFormat($targetPath, 17)
    Write-Output 'Exported the development report to PDF.'
} finally {
    if ($null -ne $reportDocument) { $reportDocument.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($reportDocument) }
    if ($null -ne $wordApp) { $wordApp.Quit(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp) }
}
