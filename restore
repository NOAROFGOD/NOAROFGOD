@echo off
title 🔄 NOAR ULTRA BOOST
color 0c
mode con: cols=110 lines=40

timeout /t 1 >nul

:: เปิดบริการคืน
for %%S in (
    DiagTrack
    SysMain
    WSearch
    Fax
    Spooler
    RetailDemo
) do (
    echo 🔄 เปิดบริการ %%S ...
    sc config %%S start= auto >nul
    net start %%S >nul 2>&1
)

:: รีเซ็ต registry ที่แก้ไว้
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Power" /v CsEnabled /t REG_DWORD /d 1 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 10 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 10 /f >nul

reg add "HKCU\Control Panel\Desktop" /v MenuShowDelay /t REG_SZ /d 400 /f >nul
reg add "HKCU\Control Panel\Desktop" /v WaitToKillAppTimeout /t REG_SZ /d 20000 /f >nul
reg add "HKCU\Control Panel\Desktop" /v HungAppTimeout /t REG_SZ /d 5000 /f >nul
reg add "HKCU\Control Panel\Desktop" /v AutoEndTasks /t REG_SZ /d 0 /f >nul

:: เปิด Windows Update
sc config wuauserv start= auto >nul
net start wuauserv >nul 2>&1

:: เปิด Windows Defender Real-time Monitoring
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableRealtimeMonitoring /t REG_DWORD /d 0 /f >nul

:: ตั้ง Power Plan กลับเป็น Balanced
powercfg /setactive SCHEME_BALANCED >nul

echo.
echo ✅ คืนค่าทุกอย่างเรียบร้อย!  
timeout /t 3 >nul
exit
