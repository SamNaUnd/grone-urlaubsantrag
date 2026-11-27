param(
    [string]$PlantUmlJar,
    [string]$JavaPath
)

$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$diagramRoot=Join-Path $projectRoot 'docs/uml'
$version='1.2026.10'
$expectedHash='e9bc9e6b2eb715e8c0c929f3dcb5fc1923be13f37599b09c293c66d354e88686'

if (-not $JavaPath) {
    if ($env:JAVA_HOME) { $JavaPath=Join-Path $env:JAVA_HOME 'bin/java.exe' }
    else { $JavaPath=(Get-Command java -ErrorAction Stop).Source }
}
if (-not $PlantUmlJar) {
    $toolRoot=Join-Path $projectRoot '.local/tools'
    New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
    $PlantUmlJar=Join-Path $toolRoot "plantuml-$version.jar"
    if (-not (Test-Path -LiteralPath $PlantUmlJar)) {
        Invoke-WebRequest -Uri "https://github.com/plantuml/plantuml/releases/download/v$version/plantuml.jar" -OutFile $PlantUmlJar
    }
}
if ((Get-FileHash -LiteralPath $PlantUmlJar -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
    throw 'Die PlantUML-Datei stimmt nicht mit der festgelegten offiziellen Version überein.'
}

$diagramFiles=@(Get-ChildItem -LiteralPath $diagramRoot -Filter '*.puml' | Sort-Object Name)
if ($diagramFiles.Count -eq 0) { throw 'Keine Diagrammquellen gefunden.' }
$sourcePaths=@($diagramFiles.FullName)
foreach ($format in @('svg','png')) {
    & $JavaPath '-Djava.awt.headless=true' '-DPLANTUML_LIMIT_SIZE=16384' -jar $PlantUmlJar `
        --charset UTF-8 --disable-metadata --check-before-run --no-error-image `
        --format $format --output-dir rendered @sourcePaths
    if ($LASTEXITCODE -ne 0) { throw "Der Export als $format ist fehlgeschlagen." }
    foreach ($diagram in $diagramFiles) {
        $outputFile=Join-Path $diagramRoot ('rendered/'+$diagram.BaseName+'.'+$format)
        if (-not (Test-Path -LiteralPath $outputFile)) { throw "Grafik fehlt: $outputFile" }
    }
}
Write-Output ($diagramFiles.Count.ToString()+' Diagramme erfolgreich als SVG und PNG erzeugt.')
