# Panther Operator UI

Static production build for a root GitHub Pages site (`<owner>.github.io`).
Publish `main` / repository root; HTTPS is required for Quest WebXR.

- Operator: `/view/panther-mmr-dev/`
- Quest: `/xr/panther-mmr-dev/`

The robot backend stays near Panther. Video/data use LastMile SFU/TURN.
Control requires a separate in-memory HMAC key. No control key, SSH access,
backend settings, TURN secrets or source maps are included here.
This site does not enable robot motion.
