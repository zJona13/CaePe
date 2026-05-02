from fastapi import FastAPI

app = FastAPI(title="CaePe Backend")


@app.get("/health")
def health():
    return {"status": "ok"}
