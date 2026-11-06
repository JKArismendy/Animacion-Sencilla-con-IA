"""Servidor local de CoffeeTales: sirve la página y la lista de guiones y escenas.

    python scripts/servidor.py              # http://localhost:8000
    python scripts/servidor.py 8080         # otro puerto
    python scripts/servidor.py --manual     # sin construcción automática

Además de los archivos del proyecto responde a /api/lista con los guiones (guiones/*.json)
y las escenas (escenas/*.js) disponibles, para los selectores de la página.

Construcción automática: cuando guardas un guion de guiones/, el servidor espera unos
segundos y ejecuta construir.py con él (solo se regenera lo que cambió). El estado se ve en
la consola y en la página (/api/estado); al terminar, la página recarga el guion sola.

Edición desde la página: el botón "Editar guion" abre un panel con los campos de cada línea;
al guardar, la página envía los cambios a POST /api/guion/<nombre> y el servidor los escribe en
guiones/<nombre>.json (lo que dispara la construcción automática).
"""
import json
import os
import subprocess
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from guion import DIR_AUDIO_BASE, DIR_GUIONES, MIRADAS, PLANOS_BASE, RAIZ, listar_guiones, rutas

DIR_ESCENAS = os.path.join(RAIZ, "escenas")
CONSTRUIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "construir.py")
ESPERA = 3.0      # segundos sin cambios en el guion antes de construir (por si sigues editando)

# Estado de la construcción de cada guion: {"estado": pendiente|construyendo|listo|error, "mensaje": str}
ESTADO = {}
AUTO = True
_cerrojo = threading.Lock()


def listar_escenas():
    if not os.path.isdir(DIR_ESCENAS):
        return []
    return sorted(f[:-3] for f in os.listdir(DIR_ESCENAS) if f.endswith(".js"))


def info_guiones():
    salida = []
    for nombre in listar_guiones():
        titulo = nombre
        try:
            with open(os.path.join(DIR_GUIONES, nombre + ".json"), encoding="utf-8") as f:
                titulo = json.load(f).get("titulo", nombre)
        except (OSError, json.JSONDecodeError):
            pass
        _, dir_audio, timeline = rutas(nombre)
        listo = os.path.isfile(timeline) and os.path.isfile(os.path.join(dir_audio, "audio_completo.mp3"))
        salida.append({"id": nombre, "titulo": titulo, "listo": listo})
    return salida


def mtimes():
    salida = {}
    for nombre in listar_guiones():
        try:
            salida[nombre] = os.path.getmtime(os.path.join(DIR_GUIONES, nombre + ".json"))
        except OSError:
            pass
    return salida


def construir(nombre):
    """Ejecuta construir.py para un guion y deja el resultado en ESTADO."""
    with _cerrojo:
        ESTADO[nombre] = {"estado": "construyendo", "mensaje": "Generando voces y tiempos..."}
    print(f"\n[auto] Construyendo '{nombre}'...", flush=True)
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    cola = []
    proc = subprocess.Popen([sys.executable, CONSTRUIR, nombre], cwd=RAIZ, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding="utf-8", errors="replace")
    for linea in proc.stdout:
        print("   ", linea.rstrip(), flush=True)
        if linea.strip():
            cola = (cola + [linea.strip()])[-3:]
    ok = proc.wait() == 0
    with _cerrojo:
        ESTADO[nombre] = {"estado": "listo" if ok else "error",
                          "mensaje": "Listo" if ok else " | ".join(cola) or "Falló la construcción"}
    print(f"[auto] '{nombre}': {'listo' if ok else 'ERROR'}", flush=True)


def vigilar():
    """Hilo: detecta guiones guardados y los construye de uno en uno."""
    vistos = mtimes()
    cambio = {}   # nombre -> momento del último cambio detectado
    while True:
        time.sleep(1)
        actuales = mtimes()
        for nombre, m in actuales.items():
            if vistos.get(nombre) != m:
                vistos[nombre] = m
                cambio[nombre] = time.time()
                with _cerrojo:
                    ESTADO[nombre] = {"estado": "pendiente", "mensaje": "Cambio detectado, esperando..."}
        for nombre in [n for n, t in cambio.items() if time.time() - t >= ESPERA]:
            del cambio[nombre]
            construir(nombre)


CAMPOS_EDITABLES = ("texto", "mirada", "pausa", "solapar", "camara")


def guardar_ediciones(nombre, ediciones):
    """Aplica a guiones/<nombre>.json los campos editados desde el panel de la página.

    'ediciones' es una lista con un dict por línea (mismo orden que en el guion). Solo se
    tocan los campos de CAMPOS_EDITABLES; el resto del guion se conserva tal como está en disco.
    Devuelve un mensaje de error o None si todo fue bien.
    """
    if nombre not in listar_guiones():
        return f"No existe el guion '{nombre}'"
    ruta = os.path.join(DIR_GUIONES, nombre + ".json")
    with open(ruta, encoding="utf-8") as f:
        guion = json.load(f)
    lineas = guion.get("lineas", [])
    if not isinstance(ediciones, list) or len(ediciones) != len(lineas):
        return "El guion cambió en disco (distinto número de líneas). Cierra el panel y vuelve a abrirlo"
    planos = PLANOS_BASE | set(guion.get("planos", {}))
    for n, (linea, ed) in enumerate(zip(lineas, ediciones), 1):
        for k, v in ed.items():
            if k not in CAMPOS_EDITABLES:
                continue
            if k == "texto":
                if not str(v).strip():
                    return f"Línea {n}: el texto no puede estar vacío"
                linea[k] = str(v).strip()
            elif k == "mirada":
                if v not in MIRADAS:
                    return f"Línea {n}: mirada no válida"
                linea[k] = v
            elif k in ("pausa", "solapar"):
                try:
                    v = float(v)
                except (TypeError, ValueError):
                    return f"Línea {n}: '{k}' debe ser un número"
                if v < 0:
                    return f"Línea {n}: '{k}' no puede ser negativo"
                linea[k] = round(v, 3)
            elif k == "camara":
                if v is None:
                    continue              # cámara personalizada: no se toca desde el panel
                if v not in planos:
                    return f"Línea {n}: el plano '{v}' no existe"
                linea[k] = v
    with open(ruta, "w", encoding="utf-8", newline="\n") as f:
        json.dump(guion, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return None


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        partes = self.path.split("?")[0].strip("/").split("/")
        if len(partes) == 3 and partes[:2] == ["api", "guion"]:
            try:
                largo = int(self.headers.get("Content-Length", 0))
                ediciones = json.loads(self.rfile.read(largo).decode("utf-8")).get("lineas")
                error = guardar_ediciones(partes[2], ediciones)
            except (ValueError, OSError, json.JSONDecodeError) as e:
                error = f"Petición inválida: {e}"
            cuerpo = json.dumps({"ok": error is None, "error": error}, ensure_ascii=False).encode("utf-8")
            self.send_response(200 if error is None else 400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        self.send_error(404)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/estado":
            with _cerrojo:
                cuerpo = json.dumps({"auto": AUTO, "guiones": ESTADO}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        if self.path.split("?")[0] == "/api/lista":
            cuerpo = json.dumps({"guiones": info_guiones(), "escenas": listar_escenas()}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")   # los guiones y escenas cambian a menudo
        super().end_headers()


def main():
    global AUTO
    sys.stdout.reconfigure(errors="replace")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    AUTO = "--manual" not in sys.argv
    puerto = int(args[0]) if args else 8000
    if AUTO:
        threading.Thread(target=vigilar, daemon=True).start()
    servidor = ThreadingHTTPServer(("", puerto), partial(Handler, directory=RAIZ))
    print(f"CoffeeTales en http://localhost:{puerto}  (Ctrl+C para parar)")
    print("Construcción automática al guardar un guion: " + ("ACTIVA" if AUTO else "desactivada (--manual)"))
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
