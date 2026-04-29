mod ollama;

use once_cell::sync::Lazy;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
#[cfg(debug_assertions)]
use tauri::Manager;

static STREAM_REGISTRY: Lazy<Mutex<HashMap<String, tokio::sync::oneshot::Sender<()>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
async fn list_models() -> Result<Value, String> {
    ollama::list_models().await
}

#[tauri::command]
async fn show_model(name: String) -> Result<Value, String> {
    ollama::show_model(&name).await
}

#[tauri::command]
async fn delete_model(name: String) -> Result<Value, String> {
    ollama::delete_model(&name).await
}

#[tauri::command]
async fn pull_model(app: tauri::AppHandle, name: String) -> Result<Value, String> {
    ollama::pull_model(app, &name).await
}

#[tauri::command]
async fn chat_stream(
    app: tauri::AppHandle,
    request_id: String,
    payload: Value,
) -> Result<Value, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    {
        let mut registry = STREAM_REGISTRY.lock().map_err(|e| e.to_string())?;
        registry.insert(request_id.clone(), tx);
    }

    let result = ollama::chat_stream(app, request_id.clone(), payload, rx).await;

    {
        let mut registry = STREAM_REGISTRY.lock().map_err(|e| e.to_string())?;
        registry.remove(&request_id);
    }

    result
}

#[tauri::command]
async fn abort_stream(request_id: String) -> Result<Value, String> {
    let sender = {
        let mut registry = STREAM_REGISTRY.lock().map_err(|e| e.to_string())?;
        registry.remove(&request_id)
    };

    if let Some(tx) = sender {
        let _ = tx.send(());
        Ok(serde_json::json!({ "aborted": true }))
    } else {
        Ok(serde_json::json!({ "aborted": false }))
    }
}

#[tauri::command]
async fn ps() -> Result<Value, String> {
    ollama::ps().await
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            list_models,
            show_model,
            delete_model,
            pull_model,
            chat_stream,
            abort_stream,
            ps
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            if let Some(window) = _app.get_webview_window("main") {
                window.open_devtools();
            }
            // Start ollama automatically if not already running
            tauri::async_runtime::spawn(async {
                ollama::ensure_ollama_running().await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
