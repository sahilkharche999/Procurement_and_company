from fastapi.middleware.cors import CORSMiddleware


def add_cors_middleware(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://52.14.178.145","http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
                       "http://localhost:80", "http://localhost", "http://18.217.140.21", "http://ec2-52-14-178-145.us-east-2.compute.amazonaws.com"],
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
