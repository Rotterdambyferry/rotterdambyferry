@echo off
rem GEBRUIK: dubbelklik dit bestand. Het bouwt eerst de site opnieuw op, start
rem dan een lokale webserver en opent je browser op http://localhost:8000/.
rem AFSLUITEN: sluit gewoon dit zwarte venster, dan stopt de preview vanzelf.
cd /d "%~dp0"
node build.js
start "" http://localhost:8000/
node preview-server.js
