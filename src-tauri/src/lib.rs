mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::database::init_database,
            commands::database::get_documents,
            commands::database::create_document,
            commands::database::update_document,
            commands::database::delete_document,
            commands::database::get_history,
            commands::database::create_history,
            commands::database::delete_history,
            commands::database::clear_history,
            commands::database::get_database_path,
            commands::update::get_app_version,
            commands::fetch::tauri_fetch_url,
            commands::fetch::tauri_fetch_rendered,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            
            let db = commands::database::Database::new(app.handle())
                .expect("Failed to initialize database");
            app.manage(db);
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Failed to run tauri application: {e}");
            std::process::exit(1);
        });
}
