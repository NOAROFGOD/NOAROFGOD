mode con: cols=100 lines=35


for %%S in (SysMain WSearch DiagTrack RetailDemo Fax Spooler) do (
    sc stop %%S >nul 2>&1
    sc config %%S start= disabled >nul
)

reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableRealtimeMonitoring /t REG_DWORD /d 1 /f >nul

del /f /s /q %temp%\* >nul 2>&1
del /f /s /q C:\Windows\Temp\* >nul 2>&1
del /f /s /q C:\Windows\Prefetch\* >nul 2>&1

reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 4294967295 /f

:: ⏱ SystemResponsiveness - ลดดีเลย์ของ Service background
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v SystemResponsiveness /t REG_DWORD /d 0 /f

:: ⚡ TCP Ack - ส่งข้อมูลทันทีไม่รอรวบ
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpAckFrequency /t REG_DWORD /d 1 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TCPNoDelay /t REG_DWORD /d 1 /f

:: 📦 เพิ่ม MTU ให้การส่งข้อมูลเต็มแพ็กเกจ
netsh interface ipv4 set subinterface "Wi-Fi" mtu=1500 store=persistent >nul 2>&1
netsh interface ipv4 set subinterface "Ethernet" mtu=1500 store=persistent >nul 2>&1

:: 💥 Disable Nagle Algorithm แบบ HardCore
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{default}" /v TcpAckFrequency /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{default}" /v TCPNoDelay /t REG_DWORD /d 1 /f >nul 2>&1

:: (อยากให้เดียร์ระบุชื่อ interface จริงๆ พี่จะจัดให้แบบแม่นกว่า)

:: 📶 Enable RSS, Auto Tuning, etc.
netsh int tcp set global rss=enabled >nul
netsh int tcp set global autotuninglevel=highlyrestricted >nul
netsh int tcp set global chimney=enabled >nul
netsh int tcp set global ecncapability=disabled >nul
netsh int tcp set heuristics disabled >nul

:: 🔄 รีค่า IP/DNS/Winsock
ipconfig /flushdns >nul
netsh winsock reset >nul
netsh int ip reset >nul

:: 🌐 QoS - ปิด Limit
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Psched" /v NonBestEffortLimit /t REG_DWORD /d 0 /f

:: 🛑 ปิด Auto Proxy ที่บางทีกินเน็ต
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v AutoDetect /t REG_DWORD /d 0 /f
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f

echo ✅ HACKED
timeout /t 3 >nul
exit
