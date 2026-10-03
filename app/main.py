from fastapi import FastAPI

app = FastAPI(title="Nejat-e-Ghaza")

@app.get("/health")
def health_check():
    return {"status": "ok"}
