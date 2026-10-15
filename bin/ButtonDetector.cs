using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Automation;

class Program {
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT Point);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr hWnd, uint gaFlags);

    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    struct POINT { public int X; public int Y; }

    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    struct ButtonInfo {
        public double X, Y, Width, Height;
        public string Name;
    }

    static void Main(string[] args) {
        Console.WriteLine("READY");
        string line;
        while ((line = Console.ReadLine()) != null) {
            line = line.Trim();
            if (line == "EXIT" || line == "QUIT") break;
            if (string.IsNullOrEmpty(line)) continue;

            try {
                var parts = line.Split(' ', ',');
                if (parts.Length < 2) continue;
                double mx = double.Parse(parts[0]);
                double my = double.Parse(parts[1]);

                var target = FindNearestButton(mx, my);
                if (target != null) {
                    string safeName = (target.Value.Name ?? "button").Replace(" ", "_").Replace("\r", "").Replace("\n", "");
                    if (safeName.Length > 30) safeName = safeName.Substring(0, 30);
                    Console.WriteLine(string.Format("FOUND {0} {1} {2} {3} {4}", 
                        (int)target.Value.X, (int)target.Value.Y, 
                        (int)target.Value.Width, (int)target.Value.Height,
                        safeName));
                } else {
                    Console.WriteLine("NONE");
                }
            } catch (Exception ex) {
                Console.WriteLine("ERROR " + ex.Message.Replace('\n', ' '));
            }
        }
    }

    static ButtonInfo? FindNearestButton(double mx, double my) {
        // 1. Try UIAutomation
        try {
            var pt = new Point(mx, my);
            var hoverEl = AutomationElement.FromPoint(pt);

            if (hoverEl != null) {
                var ct = hoverEl.Current.ControlType;
                if (ct == ControlType.Button || ct == ControlType.Hyperlink || 
                    ct == ControlType.SplitButton || ct == ControlType.MenuItem ||
                    ct == ControlType.TabItem) {
                    var r = hoverEl.Current.BoundingRectangle;
                    if (r.Width > 4 && r.Height > 4 && r.Width < 1200 && r.Height < 800) {
                        return new ButtonInfo {
                            X = r.X + r.Width / 2,
                            Y = r.Y + r.Height / 2,
                            Width = r.Width,
                            Height = r.Height,
                            Name = hoverEl.Current.Name ?? "button"
                        };
                    }
                }

                // Search container
                var container = hoverEl;
                var walker = TreeWalker.ControlViewWalker;
                int depth = 0;
                while (container != null && container != AutomationElement.RootElement && depth < 4) {
                    if (container.Current.ControlType == ControlType.Window || 
                        container.Current.ControlType == ControlType.Pane ||
                        container.Current.ControlType == ControlType.Document ||
                        container.Current.ControlType == ControlType.ToolBar) {
                        break;
                    }
                    try {
                        var parent = walker.GetParent(container);
                        if (parent == null) break;
                        container = parent;
                        depth++;
                    } catch { break; }
                }

                var cond = new OrCondition(
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button),
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.SplitButton),
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Hyperlink),
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.MenuItem),
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TabItem)
                );

                AutomationElementCollection buttons = null;
                try {
                    buttons = container.FindAll(TreeScope.Descendants, cond);
                } catch {}

                if (buttons != null && buttons.Count > 0) {
                    double minDist = double.MaxValue;
                    ButtonInfo? best = null;

                    foreach (AutomationElement btn in buttons) {
                        try {
                            var r = btn.Current.BoundingRectangle;
                            if (r.IsEmpty || r.Width <= 4 || r.Height <= 4) continue;
                            if (r.Width > 1200 || r.Height > 800) continue;

                            double cx = r.X + r.Width / 2;
                            double cy = r.Y + r.Height / 2;
                            double dist = Math.Sqrt((cx - mx) * (cx - mx) + (cy - my) * (cy - my));
                            if (dist < minDist) {
                                minDist = dist;
                                best = new ButtonInfo {
                                    X = cx,
                                    Y = cy,
                                    Width = r.Width,
                                    Height = r.Height,
                                    Name = btn.Current.Name ?? "button"
                                };
                            }
                        } catch {}
                    }

                    if (best != null) return best;
                }
            }
        } catch {}

        // 2. Win32 fallback
        try {
            POINT p = new POINT { X = (int)mx, Y = (int)my };
            IntPtr hwnd = WindowFromPoint(p);
            if (hwnd != IntPtr.Zero) {
                IntPtr rootWnd = GetAncestor(hwnd, 2); // GA_ROOT
                if (rootWnd == IntPtr.Zero) rootWnd = hwnd;

                var winButtons = new List<ButtonInfo>();
                EnumChildWindows(rootWnd, (child, lp) => {
                    if (!IsWindowVisible(child)) return true;
                    var sb = new System.Text.StringBuilder(128);
                    GetClassName(child, sb, 128);
                    string cls = sb.ToString().ToLower();
                    if (cls.Contains("button") || cls.Contains("btn") || cls.Contains("tool") || cls.Contains("tab")) {
                        RECT r;
                        if (GetWindowRect(child, out r)) {
                            int w = r.Right - r.Left;
                            int h = r.Bottom - r.Top;
                            if (w > 4 && h > 4 && w < 800 && h < 500) {
                                winButtons.Add(new ButtonInfo {
                                    X = r.Left + w / 2,
                                    Y = r.Top + h / 2,
                                    Width = w,
                                    Height = h,
                                    Name = cls
                                });
                            }
                        }
                    }
                    return true;
                }, IntPtr.Zero);

                double minDist = double.MaxValue;
                ButtonInfo? best = null;
                foreach (var b in winButtons) {
                    double dist = Math.Sqrt((b.X - mx) * (b.X - mx) + (b.Y - my) * (b.Y - my));
                    if (dist < minDist) {
                        minDist = dist;
                        best = b;
                    }
                }
                if (best != null) return best;
            }
        } catch {}

        return null;
    }
}
