Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$procs = Get-Process chrome | Where-Object { $_.MainWindowTitle -ne "" -or $_.Id -eq 4552 }
Write-Output "Checking processes: $($procs.Count)"

foreach ($p in $procs) {
    $cond = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ProcessIdProperty, $p.Id)
    $w = [Windows.Automation.AutomationElement]::RootElement.FindFirst([Windows.Automation.TreeScope]::Children, $cond)
    if ($w) {
        Write-Output "PID $($p.Id): Name='$($w.Current.Name)', ClassName='$($w.Current.ClassName)'"
        $tabCond = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty, [Windows.Automation.ControlType]::TabItem)
        $tabs = $w.FindAll([Windows.Automation.TreeScope]::Descendants, $tabCond)
        Write-Output "  Tabs found: $($tabs.Count)"
        foreach ($t in $tabs) {
            Write-Output "    Tab: $($t.Current.Name)"
        }
        $editCond = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty, [Windows.Automation.ControlType]::Edit)
        $edits = $w.FindAll([Windows.Automation.TreeScope]::Descendants, $editCond)
        foreach ($e in $edits) {
            Write-Output "    Edit: $($e.Current.Name) = $($e.Current.HelpText)"
        }
    }
}
