@echo off
setlocal
set ZIPFILE=%~2
set DESTDIR=%~4
powershell -NoProfile -Command "Expand-Archive -Force -Path '%ZIPFILE%' -DestinationPath '%DESTDIR%'"
endlocal
