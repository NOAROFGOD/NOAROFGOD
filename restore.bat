
:: เปิด Services ที่เคยปิดกลับ
for %%S in (SysMain WSearch DiagTrack RetailDemo Fax Spooler) do (
    sc config %%S start= delayed-auto >nul
    sc start %%S >nul 2>&1
)

:: เปิด Realtime Defender กลับ
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableRealtimeMonitoring /f >nul 2>&1

:: คืนค่า Multimedia SystemProfile
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v NetworkThrottlingIndex /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v SystemResponsiveness /f >nul 2>&1

:: คืนค่า TCP settings
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpAckFrequency /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TCPNoDelay /f >nul 2>&1

:: ถ้าเคยยิงใส่ Interface แบบ {default} (อันนี้ควรปรับให้ใช้ Interface จริง)
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{default}" /v TcpAckFrequency /f >nul 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{default}" /v TCPNoDelay /f >nul 2>&1

:: QoS Default
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\Psched" /v NonBestEffortLimit /f >nul 2>&1

:: Auto Proxy Settings
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v AutoDetect /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /f >nul 2>&1

:: ค่า TCP/IP กลับ default
netsh int tcp reset >nul
netsh winsock reset >nul
netsh int ip reset >nul

:: MTU Default (ไม่บังคับ แค่ปรับคืนแบบทั่วไป)
netsh interface ipv4 set subinterface "Wi-Fi" mtu=1400 store=persistent >nul 2>&1
netsh interface ipv4 set subinterface "Ethernet" mtu=1400 store=persistent >nul 2>&1

echo.
echo ✅ คืนค่าทุกอย่างเรียบร้อย คอมกลับสู่สมดุล~ 🍃
timeout /t 3 >nul
exit
