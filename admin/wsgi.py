import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Debug mode (Werkzeug's interactive debugger) shows full stack traces
    # and an interactive eval console on any unhandled exception - opt-in
    # only, and never for anything resembling a real deployment. Default is
    # off so this banking admin tool never leaks internals by accident.
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug)
