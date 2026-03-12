from fastapi import FastAPI

# Create a FastAPI instance
app = FastAPI()

# Define a path operation decorator
@app.get("/")
# Define the path operation function
async def root():
    return {"message": "Hello World"}