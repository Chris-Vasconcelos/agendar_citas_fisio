// Windows .NET Framework 4.8. Built on CI; no compiler/runtime installation in the consultorio.
using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Management;
using System.IO.Compression;

namespace MinaDesktop {
 public sealed class MinaFailure : Exception {
  public string Code;
  public MinaFailure(string code, string message) : base(message) { Code = code; }
 }
 public sealed class PayloadFile { public string path; public string sha256; }
 public sealed class PayloadManifest { public int version; public PayloadFile[] files; }
 public sealed class Runtime {
  public readonly string DataRoot, AppRoot;
  public const string Origin = "http://127.0.0.1:8090";
  static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 4 * 1024 * 1024 };
  public Runtime(string dataRoot) { DataRoot = Path.GetFullPath(dataRoot); AppRoot = Path.Combine(DataRoot, "app"); }
  public static string Hash(string file) { using (var sha = SHA256.Create()) using (var input = File.OpenRead(file)) return BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "").ToLowerInvariant(); }
  public static string Full(string path) { return Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar); }
  public static bool Same(string left, string right) { return String.Equals(Full(left), Full(right), StringComparison.OrdinalIgnoreCase); }
  public static string Child(string root, string relative) {
   if (String.IsNullOrWhiteSpace(relative) || Path.IsPathRooted(relative) || relative.Contains(":") || relative.Split('/', '\\').Any(p => p == "..")) throw new MinaFailure("INVALID_PACKAGE", "El paquete contiene una ruta no válida. Descárgalo de nuevo.");
   string full = Path.GetFullPath(Path.Combine(root, relative));
   if (!full.StartsWith(Full(root) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new MinaFailure("INVALID_PACKAGE", "Ruta fuera del paquete.");
   return full;
  }
  public static PayloadManifest Verify(string root) {
   var manifest = Json.Deserialize<PayloadManifest>(File.ReadAllText(Path.Combine(root, "payload-manifest.json")));
   if (manifest == null || manifest.version != 1 || manifest.files == null) throw new MinaFailure("INVALID_PACKAGE", "Falta la lista de archivos del paquete.");
   var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
   foreach (var file in manifest.files) {
    if (!seen.Add(file.path)) throw new MinaFailure("INVALID_PACKAGE", "El paquete tiene archivos duplicados.");
    string path = Child(root, file.path);
    if (!File.Exists(path) || Hash(path) != file.sha256) throw new MinaFailure("INVALID_PACKAGE", "Falta o está dañado un archivo de MINA: " + file.path + ". Descarga y extrae el paquete completo.");
   }
   foreach (string required in new[] { "pocketbase.exe", "MINA.exe", "caddy.exe", "web/index.html", "version.json" })
    if (!seen.Contains(required)) throw new MinaFailure("INVALID_PACKAGE", "El paquete está incompleto: " + required);
   return manifest;
  }
  IDisposable Maintenance() {
   Directory.CreateDirectory(DataRoot);
   for(int i=0;i<50;i++) {
    try { return new FileStream(Path.Combine(DataRoot, "mantenimiento.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None); }
    catch(IOException) { Thread.Sleep(100); }
   }
   throw new MinaFailure("MAINTENANCE", "MINA está iniciando o realizando un respaldo. Espera unos segundos e inténtalo de nuevo.");
  }
  public static string Quote(string value) {
   var b = new StringBuilder("\""); int slash = 0;
   foreach (char c in value) {
    if (c == '\\') { slash++; continue; }
    if (c == '"') b.Append('\\', slash * 2 + 1).Append('"');
    else b.Append('\\', slash).Append(c);
    slash = 0;
   }
   return b.Append('\\', slash * 2).Append('"').ToString();
  }
  // Direct inherited log handles allow the child to continue after this launcher exits.
  [StructLayout(LayoutKind.Sequential)] struct Security { public int length; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct Startup {
   public int cb; public string reserved, desktop, title; public int x,y,xsize,ysize,xchars,ychars,fill,flags; public short show,reserved2; public IntPtr reservedPtr,input,output,error;
  }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process, thread; public int pid, tid; }
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr CreateFile(string name, uint access, uint share, ref Security attributes, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CreateProcess(string app, StringBuilder args, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr environment, string directory, ref Startup startup, out ProcessInfo process);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr CommandLineToArgvW(string command, out int count);
  [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr pointer);
  static string[] Arguments(string command) {
   int count; IntPtr pointer = CommandLineToArgvW(command, out count);
   if (pointer == IntPtr.Zero) return new string[0];
   try { return Enumerable.Range(0,count).Select(i => Marshal.PtrToStringUni(Marshal.ReadIntPtr(pointer, i * IntPtr.Size))).ToArray(); }
   finally { LocalFree(pointer); }
  }
  static string Flag(string[] args, string name) {
   for (int i=0;i<args.Length;i++) { if (args[i] == name && i+1<args.Length) return args[i+1]; if (args[i].StartsWith(name+"=")) return args[i].Substring(name.Length+1); }
   return null;
  }
  int Spawn(string exe, string[] args, string stdout, string stderr, string directory) {
   var security = new Security { length = Marshal.SizeOf(typeof(Security)), inherit = true };
   IntPtr output = new IntPtr(-1), error = new IntPtr(-1), input = new IntPtr(-1);
   try {
    output = CreateFile(stdout, 0x40000000, 7, ref security, 2, 0x80, IntPtr.Zero);
    error = CreateFile(stderr, 0x40000000, 7, ref security, 2, 0x80, IntPtr.Zero);
    input = CreateFile("NUL", 0x80000000, 7, ref security, 3, 0x80, IntPtr.Zero);
    if (output.ToInt64()==-1 || error.ToInt64()==-1 || input.ToInt64()==-1) throw new MinaFailure("LOG_ACCESS", "No se pudieron preparar los archivos de inicio. Comprueba permisos y espacio del disco.");
    var start = new Startup { cb = Marshal.SizeOf(typeof(Startup)), flags = 0x100, input=input, output=output, error=error };
    ProcessInfo process;
    if (!CreateProcess(exe, new StringBuilder(Quote(exe)+" "+String.Join(" ",args.Select(Quote))), IntPtr.Zero, IntPtr.Zero, true, 0x08000000, IntPtr.Zero, directory, ref start, out process))
     throw new MinaFailure("START_FAILED", "Windows no permitió iniciar el servidor. Abre Comprobar MINA para revisar la instalación.");
    CloseHandle(process.thread); CloseHandle(process.process); return process.pid;
   } finally { foreach (var handle in new[] {output,error,input}) if (handle.ToInt64()!=-1) CloseHandle(handle); }
  }
  Process Managed(string marker, string exeName, string flag, string expected, string binaryRoot) {
   string pidPath=Path.Combine(DataRoot, marker); if (!File.Exists(pidPath)) return null;
   int pid; if (!Int32.TryParse(File.ReadAllText(pidPath).Trim(), out pid)) throw new MinaFailure("PID_INVALID", "El registro de inicio está dañado. Abre Comprobar MINA.");
   Process process; try { process=Process.GetProcessById(pid); } catch (ArgumentException) { File.Delete(pidPath); return null; }
   string path;
   try {
    path=process.MainModule.FileName;
    if (!String.Equals(Path.GetFileName(path),exeName,StringComparison.OrdinalIgnoreCase) || Hash(path)!=Hash(Path.Combine(binaryRoot,exeName))) throw new Exception();
    using (var info=new ManagementObject("Win32_Process.Handle='"+pid+"'")) {
     info.Get(); string destination=Flag(Arguments((string)info["CommandLine"]),flag);
     if (destination==null || !Same(destination,expected)) throw new Exception();
    }
   } catch { throw new MinaFailure("OTHER_PROCESS", "El proceso registrado no corresponde a los datos de esta instalación. No se detuvo ningún programa ajeno. Abre Comprobar MINA."); }
   return process;
  }
  void StopOne(string marker,string exe,string flag,string expected,string binaries) {
   var process=Managed(marker,exe,flag,expected,binaries);
   if (process!=null) { process.Kill(); if (!process.WaitForExit(10000)) throw new MinaFailure("STOP_FAILED","MINA no terminó de cerrarse. Cierra la aplicación e inténtalo de nuevo."); process.Dispose(); }
   string path=Path.Combine(DataRoot,marker); if (File.Exists(path)) File.Delete(path);
  }
  void StopInside(string binaries) {
   StopOne("celular.pid","caddy.exe","--config",Path.Combine(DataRoot,"celular.Caddyfile"),binaries);
   StopOne("servidor.pid","pocketbase.exe","--dir",Path.Combine(DataRoot,"pb_data"),binaries);
  }
  public void Stop() { using (Maintenance()) { Verify(AppRoot); StopInside(AppRoot); } }
  public static bool PortBusy(int port) { return IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpListeners().Any(p=>p.Port==port); }
  public static Dictionary<string,object> Api(string path, string method, object payload, string token) {
   var request=(HttpWebRequest)WebRequest.Create(Origin+path); request.Proxy=null; request.Method=method; request.Timeout=15000; request.AllowAutoRedirect=false;
   if (token!=null) request.Headers["Authorization"]=token;
   if (payload!=null) { request.ContentType="application/json"; byte[] bytes=Encoding.UTF8.GetBytes(Json.Serialize(payload)); using(var output=request.GetRequestStream()) output.Write(bytes,0,bytes.Length); }
   try { using(var response=request.GetResponse()) using(var input=new StreamReader(response.GetResponseStream())) return Json.Deserialize<Dictionary<string,object>>(input.ReadToEnd()); }
   catch(WebException failure) {
    if (failure.Response!=null) failure.Response.Dispose();
    throw new MinaFailure("ACCOUNT_REQUEST", "No se pudo confirmar la cuenta. Revisa el correo y la contraseña; si la cuenta ya existe, usa sus datos actuales. No se han reemplazado contraseñas de otras cuentas.");
   }
  }
  public void Start() {
   using(Maintenance()) {
    Verify(AppRoot);
    var process=Managed("servidor.pid","pocketbase.exe","--dir",Path.Combine(DataRoot,"pb_data"),AppRoot);
    if (process!=null && !Same(process.MainModule.FileName,Path.Combine(AppRoot,"pocketbase.exe"))) { StopInside(AppRoot); process=null; }
    if (process==null) {
     if (PortBusy(8090)) throw new MinaFailure("PORT_IN_USE", "El puerto de MINA está ocupado por otro servidor o por una copia anterior sin identificar. No abras otra copia. Usa Comprobar MINA.");
     int pid=Spawn(Path.Combine(AppRoot,"pocketbase.exe"),new[]{"serve","--http","127.0.0.1:8090","--dev=false","--dir",Path.Combine(DataRoot,"pb_data"),"--migrationsDir",Path.Combine(AppRoot,"pb_migrations"),"--publicDir",Path.Combine(AppRoot,"web")},Path.Combine(DataRoot,"servidor.log"),Path.Combine(DataRoot,"servidor-error.log"),AppRoot);
     File.WriteAllText(Path.Combine(DataRoot,"servidor.pid"),pid.ToString()); process=Process.GetProcessById(pid);
    }
    bool ready=false;
    for(int i=0;i<100;i++) { if(process.HasExited) break; try { Api("/api/health","GET",null,null); ready=true; break; } catch {} Thread.Sleep(100); }
    if(!ready) throw new MinaFailure("SERVER_NOT_READY","El servidor no quedó listo. Abre Comprobar MINA; no se mostrará una agenda vacía.");
    string config=Path.Combine(DataRoot,"celular.Caddyfile");
    if(File.Exists(config) && Managed("celular.pid","caddy.exe","--config",config,AppRoot)==null) {
     string previous=Environment.GetEnvironmentVariable("XDG_DATA_HOME"), previousConfig=Environment.GetEnvironmentVariable("XDG_CONFIG_HOME");
     try {
      Environment.SetEnvironmentVariable("XDG_DATA_HOME",Path.Combine(DataRoot,"https-datos")); Environment.SetEnvironmentVariable("XDG_CONFIG_HOME",Path.Combine(DataRoot,"https-config"));
      int id=Spawn(Path.Combine(AppRoot,"caddy.exe"),new[]{"run","--config",config,"--adapter","caddyfile"},Path.Combine(DataRoot,"https.log"),Path.Combine(DataRoot,"https-error.log"),DataRoot);
      File.WriteAllText(Path.Combine(DataRoot,"celular.pid"),id.ToString()); Thread.Sleep(1000);
      if(Process.GetProcessById(id).HasExited) throw new MinaFailure("HTTPS_FAILED","MINA inició, pero el acceso del celular no quedó listo. Revisa la IP privada en Comprobar MINA.");
     } finally { Environment.SetEnvironmentVariable("XDG_DATA_HOME",previous); Environment.SetEnvironmentVariable("XDG_CONFIG_HOME",previousConfig); }
    }
   }
  }
  public string BootstrapToken() {
   string log=Path.Combine(DataRoot,"servidor.log"); if(!File.Exists(log)) return null;
   using(var file=new FileStream(log,FileMode.Open,FileAccess.Read,FileShare.ReadWrite)) using(var reader=new StreamReader(file)) {
    var match=System.Text.RegularExpressions.Regex.Match(reader.ReadToEnd(),@"/pbinstall/([^\s]+)");
    return match.Success ? match.Groups[1].Value : null;
   }
  }
  static string Claim(string jwt,string key) {
   string value=jwt.Split('.')[1].Replace('-','+').Replace('_','/'); value=value.PadRight((value.Length+3)/4*4,'=');
   return Convert.ToString(Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(Convert.FromBase64String(value)))[key]);
  }
  public void ConfigureAccounts(string adminEmail,string adminPassword,string dailyEmail,string dailyPassword) {
   if(!adminEmail.Contains("@") || !dailyEmail.Contains("@") || adminPassword.Length==0 || dailyPassword.Length<12 || adminPassword==dailyPassword)
    throw new MinaFailure("ACCOUNT_INPUT","Usa correos válidos y dos contraseñas distintas de al menos 12 caracteres.");
   Start(); Dictionary<string,object> login=null;
   try { login=Api("/api/collections/_superusers/auth-with-password","POST",new{identity=adminEmail,password=adminPassword},null); } catch(MinaFailure) {}
   if(login==null) {
    if(adminPassword.Length<12) throw new MinaFailure("ADMIN_PASSWORD","La contraseña nueva del responsable debe tener al menos 12 caracteres.");
    string token=BootstrapToken();
    if(token==null) throw new MinaFailure("ADMIN_LOGIN","Ya existe una cuenta responsable. Usa sus datos actuales; no se puede crear otra desde este paso.");
    long expiry;
    if(!Int64.TryParse(Claim(token,"exp"),out expiry) || expiry<=DateTimeOffset.UtcNow.ToUnixTimeSeconds()+5) { Stop(); Start(); token=BootstrapToken(); }
    if(token==null) throw new MinaFailure("ADMIN_LOGIN","No se pudo obtener la instalacion inicial. Usa la cuenta responsable existente.");
    Api("/api/collections/_superusers/records/"+Claim(token,"id"),"PATCH",new{email=adminEmail,password=adminPassword,passwordConfirm=adminPassword},token);
    login=Api("/api/collections/_superusers/auth-with-password","POST",new{identity=adminEmail,password=adminPassword},null);
   }
   string superToken=(string)login["token"];
   bool exists=false;
   try { Api("/api/collections/mina_operators/auth-with-password","POST",new{identity=dailyEmail,password=dailyPassword},null); exists=true; } catch(MinaFailure) {}
   if(!exists) Api("/api/collections/mina_operators/records","POST",new{email=dailyEmail,password=dailyPassword,passwordConfirm=dailyPassword},superToken);
   Api("/api/collections/mina_operators/auth-with-password","POST",new{identity=dailyEmail,password=dailyPassword},null);
   File.WriteAllText(Path.Combine(DataRoot,"cuenta-configurada"),"1");
  }
  public static string Browser() {
   string[] candidates={Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Microsoft/Edge/Application/msedge.exe"),Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"Microsoft/Edge/Application/msedge.exe"),Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"Google/Chrome/Application/chrome.exe"),Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Google/Chrome/Application/chrome.exe")};
   return candidates.FirstOrDefault(File.Exists);
  }
  public void OpenWindow() {
   string browser=Browser(); if(browser==null) throw new MinaFailure("BROWSER_MISSING","Para abrir la ventana MINA se necesita Microsoft Edge o Chrome. Instala o repara uno de ellos y vuelve a abrir MINA.");
   Process.Start(new ProcessStartInfo(browser,"--app="+Origin+"/ --no-first-run --user-data-dir="+Quote(Path.Combine(DataRoot,"perfil-navegador"))) { UseShellExecute=false });
  }
  static void Shortcut(string path,string target,string args) {
   Type type=Type.GetTypeFromProgID("WScript.Shell"); dynamic shell=Activator.CreateInstance(type);
   try { dynamic link=shell.CreateShortcut(path); link.TargetPath=target; link.Arguments=args; link.WorkingDirectory=Path.GetDirectoryName(target); link.IconLocation=target+",0"; link.Save(); Marshal.FinalReleaseComObject(link); }
   finally { Marshal.FinalReleaseComObject(shell); }
  }
  public void Shortcuts(string desktop,string startup) {
   Directory.CreateDirectory(desktop); Directory.CreateDirectory(startup); string target=Path.Combine(AppRoot,"MINA.exe");
   Shortcut(Path.Combine(desktop,"MINA.lnk"),target,""); Shortcut(Path.Combine(desktop,"Comprobar MINA.lnk"),target,"--diagnose"); Shortcut(Path.Combine(startup,"MINA.lnk"),target,"--background");
  }
  public static void RetireLegacyTask() {
   dynamic service=Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service"));
   try {
    service.Connect(); dynamic folder=service.GetFolder("\\"); dynamic task=null;
    try { task=folder.GetTask("MINA Local - inicio del consultorio"); } catch(COMException) { return; }
    dynamic action=task.Definition.Actions.Item(1);
    if(!String.Equals(Path.GetFileName((string)action.Path),"powershell.exe",StringComparison.OrdinalIgnoreCase) || !((string)action.Arguments).Contains("Iniciar-MINA.ps1")) throw new MinaFailure("STARTUP_CONFLICT","Ya existe otra tarea con el nombre de MINA. Comprueba su configuración antes de cambiar el inicio.");
    folder.DeleteTask("MINA Local - inicio del consultorio",0);
   } finally { Marshal.FinalReleaseComObject(service); }
  }
  public void Install(string source,bool loginShortcut,string desktop,string startup) {
   var manifest=Verify(source); Directory.CreateDirectory(DataRoot);
   string staged=Path.Combine(DataRoot,"app-nueva-"+Guid.NewGuid().ToString("N")); Directory.CreateDirectory(staged);
   string previous=null;
   try {
    foreach(var file in manifest.files) { string target=Child(staged,file.path); Directory.CreateDirectory(Path.GetDirectoryName(target)); File.Copy(Child(source,file.path),target); }
    File.Copy(Path.Combine(source,"payload-manifest.json"),Path.Combine(staged,"payload-manifest.json")); Verify(staged);
    using(Maintenance()) {
     StopInside(source);
     string data=Path.Combine(DataRoot,"pb_data");
     if(Directory.Exists(data) && File.Exists(Path.Combine(data,"data.db"))) {
      string snapshots=Path.Combine(DataRoot,"recuperacion-previa"); Directory.CreateDirectory(snapshots);
      ZipFile.CreateFromDirectory(data,Path.Combine(snapshots,DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6)+".zip"));
     }
     if(Directory.Exists(AppRoot)) { previous=Path.Combine(DataRoot,"app-anterior-"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6)); Directory.Move(AppRoot,previous); }
     try { Directory.Move(staged,AppRoot); } catch { if(previous!=null && !Directory.Exists(AppRoot)) Directory.Move(previous,AppRoot); throw; }
    }
    if(loginShortcut) { RetireLegacyTask(); Shortcuts(desktop,startup); }
   } finally { if(Directory.Exists(staged)) Directory.Delete(staged,true); }
  }
  public Dictionary<string,object> Diagnose() {
   var result=new Dictionary<string,object>(); result["momento_utc"]=DateTime.UtcNow.ToString("o"); result["windows_x64"]=Environment.Is64BitOperatingSystem;
   result["base_presente"]=File.Exists(Path.Combine(DataRoot,"pb_data/data.db")); result["navegador_disponible"]=Browser()!=null; result["puerto_ocupado"]=PortBusy(8090);
   try { Verify(AppRoot); result["archivos"]="correctos"; } catch { result["archivos"]="faltan archivos o hay cambios; reinstalar el paquete oficial"; }
   try { var p=Managed("servidor.pid","pocketbase.exe","--dir",Path.Combine(DataRoot,"pb_data"),AppRoot); result["servidor_identificado"]=p!=null; } catch { result["servidor_identificado"]=false; }
   try { result["version"]=Json.DeserializeObject(File.ReadAllText(Path.Combine(AppRoot,"version.json"))); } catch { result["version"]="desconocida"; }
   // Never include logs, bootstrap URLs, tokens, credentials, browser profile or clinical files.
   return result;
  }
  public static string Serialize(object value) { return Json.Serialize(value); }
 }
 public sealed class WelcomeForm : Form {
  readonly Runtime runtime; readonly string source; readonly bool configureOnly;
  public WelcomeForm(Runtime runtime,string source,bool configureOnly) {
   this.runtime=runtime; this.source=source; this.configureOnly=configureOnly;
   Text="MINA · Preparar el consultorio"; Width=590; Height=400; StartPosition=FormStartPosition.CenterScreen; Font=new Font("Segoe UI",10); BackColor=Color.FromArgb(247,244,237); FormBorderStyle=FormBorderStyle.FixedDialog; MaximizeBox=false;
   var title=new Label{Text=configureOnly?"Configurar la cuenta de MINA":"Instalar MINA para esta cuenta Windows",Left=24,Top=24,Width=530,Height=40,Font=new Font(Font.FontFamily,15,FontStyle.Bold)};
   var info=new Label{Text="MINA conservará tus expedientes y fotografías en esta cuenta Windows. No requiere permisos de administrador.\n\nSe creará el acceso MINA en el escritorio y se preparará el servidor para iniciar al entrar en Windows.\n\nUsa datos ficticios hasta completar la prueba del consultorio y la recuperación desde un respaldo externo.",Left=24,Top=75,Width=530,Height=145};
   var consent=new CheckBox{Name="closedConsent",Text="He cerrado MINA y guardado mis capturas antes de continuar.",Left=24,Top=225,Width=530,Height=35};
   var button=new Button{Name="installButton",Text=configureOnly?"Continuar":"Instalar y continuar",Left=24,Top=278,Width=220,Height=42,Enabled=configureOnly};
   var status=new Label{Name="status",Left=24,Top=330,Width=530,Height=35};
   consent.CheckedChanged+=(s,e)=>button.Enabled=consent.Checked;
   bool preparing=false;
   FormClosing+=(s,e)=> { if(preparing) { e.Cancel=true; status.Text="Espera a que termine la preparación."; } };
   button.Click+=async(s,e)=>{
    preparing=true; button.Enabled=false; consent.Enabled=false; status.Text="Preparando MINA…";
    try {
     await Task.Run(()=> { if(!configureOnly) runtime.Install(source,true,Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),Environment.GetFolderPath(Environment.SpecialFolder.Startup)); runtime.Start(); });
     preparing=false; Hide(); using(var accounts=new AccountForm(runtime)) accounts.ShowDialog(); Close();
    } catch(Exception failure) { status.Text="No se terminó la preparación."; MessageBox.Show(failure.Message,"MINA",MessageBoxButtons.OK,MessageBoxIcon.Warning); preparing=false; button.Enabled=true; consent.Enabled=true; }
   };
   Controls.AddRange(new Control[]{title,info,consent,button,status});
  }
 }
 public sealed class AccountForm : Form {
  readonly Runtime runtime;
  public AccountForm(Runtime runtime) : this(runtime,false) {}
  public AccountForm(Runtime runtime,bool forceCreate) {
   AutoScroll=true;
   if(!forceCreate && File.Exists(Path.Combine(runtime.DataRoot,"pb_data/data.db")) && runtime.BootstrapToken()==null) {
    Text="MINA · Instalación preparada"; Width=590; Height=300; StartPosition=FormStartPosition.CenterScreen; Font=new Font("Segoe UI",10); BackColor=Color.FromArgb(247,244,237);
    Controls.Add(new Label{Text="Tus datos y tus cuentas se conservaron",Left=24,Top=22,Width=530,Height=35,Font=new Font(Font.FontFamily,14,FontStyle.Bold)});
    Controls.Add(new Label{Text="Entra con el correo y la contraseña de MINA que ya utilizabas. No necesitas crear otro usuario para ver tus expedientes.",Left=24,Top=70,Width=530,Height=70});
    var openExisting=new Button{Name="existingAccount",Text="Abrir MINA con mi cuenta actual",Left=24,Top=145,Width=530,Height=42};
    openExisting.Click+=(s,e)=> { try { runtime.OpenWindow(); File.WriteAllText(Path.Combine(runtime.DataRoot,"cuenta-configurada"),"1"); Close(); } catch(Exception failure) { MessageBox.Show(failure.Message,"MINA"); } };
    var createOther=new Button{Name="advancedAccount",Text="Responsable: necesito crear la cuenta diaria",Left=24,Top=200,Width=530,Height=32};
    createOther.Click+=(s,e)=> { Hide(); using(var form=new AccountForm(runtime,true)) form.ShowDialog(); Close(); };
    Controls.AddRange(new Control[]{openExisting,createOther}); return;
   }
   this.runtime=runtime; Text="MINA · Cuenta del consultorio"; Width=620; Height=590; StartPosition=FormStartPosition.CenterScreen; Font=new Font("Segoe UI",10); BackColor=Color.FromArgb(247,244,237); FormBorderStyle=FormBorderStyle.FixedDialog; MaximizeBox=false;
   Controls.Add(new Label{Text="Crea las cuentas sin entrar al panel del servidor",Left=22,Top=20,Width=550,Height=35,Font=new Font(Font.FontFamily,13,FontStyle.Bold)});
   Controls.Add(new Label{Text="Responsable: guarda estos datos para administrar o recuperar el acceso.\nUso diario: esta es la cuenta con la que entrarás a MINA.\nLas contraseñas nuevas deben ser distintas y tener al menos 12 caracteres.",Left=22,Top=60,Width=555,Height=75});
   string[] labels={"Correo del responsable","Contraseña del responsable","Confirmar contraseña del responsable","Correo para uso diario","Contraseña para uso diario","Confirmar contraseña para uso diario"};
   var fields=new List<TextBox>();
   for(int i=0;i<labels.Length;i++) { int top=145+i*48; Controls.Add(new Label{Text=labels[i],Left=22,Top=top,Width=280,Height=24}); var field=new TextBox{Name="account"+i,Left=305,Top=top-2,Width=265,UseSystemPasswordChar=i!=0&&i!=3}; fields.Add(field); Controls.Add(field); }
   var create=new Button{Name="createAccounts",Text="Crear cuentas",Left=22,Top=445,Width=180,Height=40};
   var existing=new Button{Name="existingAccount",Text="Ya tengo cuenta: abrir MINA",Left=220,Top=445,Width=350,Height=40};
   var status=new Label{Name="accountStatus",Left=22,Top=495,Width=550,Height=50};
   bool creating=false;
   FormClosing+=(s,e)=> { if(creating) { e.Cancel=true; status.Text="Espera a que se compruebe la cuenta."; } };
   create.Click+=async(s,e)=>{
    if(fields[1].Text!=fields[2].Text || fields[4].Text!=fields[5].Text) { status.Text="Las confirmaciones de contraseña no coinciden."; return; }
    creating=true; create.Enabled=false; existing.Enabled=false; status.Text="Creando y comprobando la cuenta…";
    string a=fields[0].Text.Trim(),b=fields[1].Text,c=fields[3].Text.Trim(),d=fields[4].Text;
    try { await Task.Run(()=>runtime.ConfigureAccounts(a,b,c,d)); fields.ForEach(f=>f.Clear()); runtime.OpenWindow(); creating=false; Close(); }
    catch(Exception failure) { status.Text=failure.Message; }
    finally { a=b=c=d=null; creating=false; if(!IsDisposed) { create.Enabled=true; existing.Enabled=true; } }
   };
   existing.Click+=(s,e)=> { try { runtime.OpenWindow(); File.WriteAllText(Path.Combine(runtime.DataRoot,"cuenta-configurada"),"1"); Close(); } catch(Exception failure) { status.Text=failure.Message; } };
   Controls.AddRange(new Control[]{create,existing,status});
  }
 }
 public sealed class DiagnosticForm : Form {
  public DiagnosticForm(Runtime runtime) {
   Text="Comprobar MINA"; Width=620; Height=450; StartPosition=FormStartPosition.CenterScreen; Font=new Font("Segoe UI",10);
   var output=new TextBox{Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Vertical,Left=20,Top=20,Width=560,Height=250};
   var data=runtime.Diagnose(); output.Text=String.Join(Environment.NewLine,data.Select(pair=>pair.Key+": "+Runtime.Serialize(pair.Value)));
   var open=new Button{Text="Abrir MINA",Left=20,Top=290,Width=150,Height=40};
   open.Click+=async(s,e)=> { open.Enabled=false; try { await Task.Run(()=>runtime.Start()); runtime.OpenWindow(); Close(); } catch(Exception failure) { MessageBox.Show(failure.Message,"MINA"); } finally { open.Enabled=true; } };
   var save=new Button{Text="Guardar diagnóstico",Left=190,Top=290,Width=190,Height=40};
   save.Click+=(s,e)=>{ using(var dialog=new SaveFileDialog{Filter="Diagnóstico MINA|*.json",FileName="MINA-diagnostico.json"}) if(dialog.ShowDialog()==DialogResult.OK) File.WriteAllText(dialog.FileName,Runtime.Serialize(data)); };
   Controls.Add(new Label{Text="El diagnóstico no incluye expedientes, fotografías, contraseñas ni registros privados.",Left=20,Top=350,Width=560,Height=40});
   Controls.AddRange(new Control[]{output,open,save});
  }
 }
 public static class Program {
  [STAThread] public static int Main(string[] args) {
   Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
   string temp=null;
   try {
    if(!Environment.Is64BitOperatingSystem) throw new MinaFailure("WINDOWS_X64","Este paquete requiere Windows de 64 bits.");
    var runtime=new Runtime(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"MINA-Local"));
    using(var resource=Assembly.GetExecutingAssembly().GetManifestResourceStream("MINA.Payload.zip")) {
     if(resource!=null) {
      temp=Path.Combine(Path.GetTempPath(),"MINA-instalacion-"+Guid.NewGuid().ToString("N")); Directory.CreateDirectory(temp);
      string zip=Path.Combine(temp,"package.zip"); using(var output=File.Create(zip)) resource.CopyTo(output);
      string source=Path.Combine(temp,"payload"); ZipFile.ExtractToDirectory(zip,source);
      using(var wizard=new WelcomeForm(runtime,source,false)) Application.Run(wizard); return 0;
     }
    }
    if(args.Contains("--diagnose")) { using(var diagnostic=new DiagnosticForm(runtime)) Application.Run(diagnostic); return 0; }
    string sourcePath=AppDomain.CurrentDomain.BaseDirectory;
    if(!Runtime.Same(sourcePath,runtime.AppRoot)) { using(var wizard=new WelcomeForm(runtime,sourcePath,false)) Application.Run(wizard); return 0; }
    runtime.Start();
    if(!args.Contains("--background")) {
     if(args.Contains("--configure") || !File.Exists(Path.Combine(runtime.DataRoot,"cuenta-configurada"))) { using(var accounts=new AccountForm(runtime)) Application.Run(accounts); }
     else runtime.OpenWindow();
    }
    return 0;
   } catch(Exception failure) { MessageBox.Show(failure.Message+"\n\nNo borres la carpeta de datos. Usa el acceso Comprobar MINA o vuelve a ejecutar el instalador oficial.","MINA",MessageBoxButtons.OK,MessageBoxIcon.Warning); return 1; }
   finally { if(temp!=null) { try { Directory.Delete(temp,true); } catch {} } }
  }
 }
}
