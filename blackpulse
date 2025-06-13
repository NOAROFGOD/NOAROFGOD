@echo off
title NOAR ULTRA BOOST
color 0a
mode con: cols=110 lines=40

echo 🧹 ล้างขยะ Temp / Prefetch / Cache...
timeout /t 1 >nul
del /f /s /q %temp%\* >nul 2>&1
del /f /s /q C:\Windows\Temp\* >nul 2>&1
del /f /s /q C:\Windows\Prefetch\* >nul 2>&1
del /f /s /q %SystemRoot%\System32\FNTCACHE.DAT >nul 2>&1
del /f /s /q "%LocalAppData%\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1
cleanmgr /sagerun:1 >nul

echo.
echo ⚡ ลด Input Lag (Scheduler + Power + GPU tweak)...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl" /v Win32PrioritySeparation /t REG_DWORD /d 26 /f >nul
bcdedit /set useplatformtick yes >nul
bcdedit /set disabledynamictick yes >nul
bcdedit /set tscsyncpolicy Enhanced >nul

echo.
echo 🧠 เพิ่มประสิทธิภาพ interrupt CPU...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v LargeSystemCache /t REG_DWORD /d 1 /f >nul
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpAckFrequency /t REG_DWORD /d 1 /f >nul
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TCPNoDelay /t REG_DWORD /d 1 /f >nul

echo.
echo 🌐 ลด Packet Loss & Ping Spike...
netsh int tcp set global rss=enabled >nul
netsh int tcp set global chimney=enabled >nul
netsh int tcp set global autotuninglevel=highlyrestricted >nul
netsh interface ipv4 set subinterface "Wi-Fi" mtu=1500 store=persistent >nul 2>&1
netsh int ip reset >nul
netsh winsock reset >nul
ipconfig /flushdns >nul

echo.
echo 💻 ปิดการ Sync, Background, Windows Update, Tips...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d 1 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v SubscribedContent-310093Enabled /t REG_DWORD /d 0 /f >nul
sc stop wuauserv >nul 2>&1
sc config wuauserv start= disabled >nul

echo.
echo 🔧 ปิด Services + Defender ชั่วคราว...
for %%S in (
    DiagTrack
    SysMain
    WSearch
    Fax
    Spooler
    RetailDemo
) do (
    echo 🔥 ปิดบริการ %%S ...
    sc stop %%S >nul 2>&1
    sc config %%S start= disabled >nul
)

reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableRealtimeMonitoring /t REG_DWORD /d 1 /f >nul

echo.
echo 📊 ยิง REG จูนระบบ...
> "%temp%\noar_boost_v3.reg" (
    echo Windows Registry Editor Version 5.00
    echo.
    echo [HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Power]
    echo "CsEnabled"=dword:00000000
    echo.
    echo [HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile]
    echo "SystemResponsiveness"=dword:00000000
    echo "NetworkThrottlingIndex"=dword:ffffffff
    echo.
    echo [HKEY_CURRENT_USER\Control Panel\Desktop]
    echo "MenuShowDelay"="0"
    echo "WaitToKillAppTimeout"="1000"
    echo "HungAppTimeout"="1000"
    echo "AutoEndTasks"="1"
)
regedit /s "%temp%\noar_boost_v3.reg"
del "%temp%\noar_boost_v3.reg"

echo.
echo ⚡ เปิด High Performance Power Plan...
powercfg /setactive SCHEME_MIN >nul

echo.
echo 💅 เคลียร์ Shell Icon Cache...
ie4uinit.exe -ClearIconCache >nul

echo.
echo ✅ ลั่นสำเร็จ! ระบบเดือดเรียบร้อยแล้วจ้าา
timeout /t 3 >nul
exit
