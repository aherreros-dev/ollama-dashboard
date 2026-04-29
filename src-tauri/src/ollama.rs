use futures_util::StreamExt;
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use tauri::Emitter;

const OLLAMA_HOST: &str = "http://127.0.0.1:11434";

const OLLAMA_SEARCH_PATHS: &[&str] = &[
    "/opt/homebrew/bin/ollama",
    "/usr/local/bin/ollama",
    "/usr/bin/ollama",
];

pub async fn ensure_ollama_running() {
    // Already running?
    if client()
        .get(format!("{}/api/tags", OLLAMA_HOST))
        .timeout(Duration::from_secs(2))
        .send()
        .await
        .is_ok()
    {
        return;
    }

    // Find and spawn ollama serve
    let ollama_bin = OLLAMA_SEARCH_PATHS
        .iter()
        .find(|p| std::path::Path::new(p).exists());

    if let Some(bin) = ollama_bin {
        let _ = std::process::Command::new(bin)
            .arg("serve")
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();

        // Wait up to 8s for ollama to be ready
        for _ in 0..16 {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if client()
                .get(format!("{}/api/tags", OLLAMA_HOST))
                .timeout(Duration::from_secs(1))
                .send()
                .await
                .is_ok()
            {
                break;
            }
        }
    }
}

fn client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .expect("Failed to create HTTP client")
}

pub async fn list_models() -> Result<Value, String> {
    let response = client()
        .get(format!("{}/api/tags", OLLAMA_HOST))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

pub async fn show_model(name: &str) -> Result<Value, String> {
    let payload = serde_json::json!({ "name": name });
    
    let response = client()
        .post(format!("{}/api/show", OLLAMA_HOST))
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

pub async fn delete_model(name: &str) -> Result<Value, String> {
    let payload = serde_json::json!({ "name": name });
    
    let response = client()
        .delete(format!("{}/api/delete", OLLAMA_HOST))
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

pub async fn pull_model(app: tauri::AppHandle, name: &str) -> Result<Value, String> {
    let payload = serde_json::json!({
        "name": name,
        "stream": true
    });
    
    let response = client()
        .post(format!("{}/api/pull", OLLAMA_HOST))
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let mut stream = response.bytes_stream();
    
    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| e.to_string())?;
        if let Ok(line) = String::from_utf8(bytes.to_vec()) {
            for part in line.split('\n') {
                let part = part.trim();
                if part.is_empty() {
                    continue;
                }
                if let Ok(json) = serde_json::from_str::<Value>(part) {
                    let status = json.get("status").and_then(|v| v.as_str()).unwrap_or("");
                    let total = json.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let completed = json.get("completed").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let progress: Option<u64> = if total > 0.0 {
                        Some(((completed / total) * 100.0) as u64)
                    } else {
                        None
                    };

                    let _ = app.emit("pull-progress", serde_json::json!({
                        "name": name,
                        "status": status,
                        "progress": progress
                    }));
                }
            }
        }
    }
    
    Ok(serde_json::json!({ "status": "success", "model": name }))
}

pub async fn chat_stream(
    app: tauri::AppHandle,
    request_id: String,
    payload: Value,
    mut abort_rx: tokio::sync::oneshot::Receiver<()>,
) -> Result<Value, String> {
    let response = client()
        .post(format!("{}/api/chat", OLLAMA_HOST))
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let stream = response.bytes_stream();
    
    let mut final_result: Option<Value> = None;
    
    tokio::select! {
        _ = &mut abort_rx => {
            let _ = app.emit(&format!("chat-done-{}", request_id), serde_json::json!({
                "done": true,
                "done_reason": "aborted"
            }));
            return Ok(serde_json::json!({ "aborted": true }));
        }
        _ = async {
            let mut stream = stream;
            while let Some(chunk) = stream.next().await {
                let bytes = match chunk {
                    Ok(b) => b,
                    Err(e) => {
                        let _ = app.emit(&format!("chat-done-{}", request_id), serde_json::json!({
                            "error": e.to_string()
                        }));
                        return;
                    }
                };
                
                if let Ok(line) = String::from_utf8(bytes.to_vec()) {
                    if line.trim().is_empty() {
                        continue;
                    }
                    
                    if let Ok(json) = serde_json::from_str::<Value>(&line) {
                        let _ = app.emit(&format!("chat-chunk-{}", request_id), &json);
                        
                        if json.get("done").and_then(|v| v.as_bool()).unwrap_or(false) {
                            let _ = app.emit(&format!("chat-done-{}", request_id), &json);
                            final_result = Some(json);
                            break;
                        }
                    }
                }
            }
        } => {}
    }
    
    Ok(final_result.unwrap_or(serde_json::json!({ "done": true })))
}

pub async fn ps() -> Result<Value, String> {
    let response = client()
        .get(format!("{}/api/ps", OLLAMA_HOST))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}