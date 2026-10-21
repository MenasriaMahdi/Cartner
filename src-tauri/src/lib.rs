use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Debug bridge: lets the webviews report JS errors / breadcrumbs to the
/// Rust console, so failures are visible in captured logs instead of just
/// the invisible web devtools.
#[tauri::command]
fn log_line(message: String) {
    println!("mochi[web]: {message}");
}

#[tauri::command]
fn toggle_settings_window(app: tauri::AppHandle) {
    println!("mochi: settings toggle reached");
    if let Some(window) = app.get_webview_window("settings") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            println!("mochi: showing settings window");
            let _ = window.show();
            let _ = window.set_focus();
        }
    } else {
        println!("mochi: settings window not found");
    }
}

/// Toggleable and created on a *background thread*: building a webview
/// window from a synchronous command on the main thread deadlocks the
/// event loop. The window is destroyed on close, so it never holds
/// memory while hidden.
#[tauri::command]
fn toggle_tasks_window(app: tauri::AppHandle) {
    println!("mochi: tasks toggle reached");
    match app.get_webview_window("tasks") {
        Some(window) => {
            if window.is_visible().unwrap_or(false) {
                let _ = window.close();
            } else {
                let _ = window.show();
                position_tasks_near_cat(&app, &window);
                let _ = window.set_focus();
            }
        }
        None => {
            std::thread::spawn(move || {
                let window = tauri::WebviewWindowBuilder::new(
                    &app,
                    "tasks",
                    tauri::WebviewUrl::App("tasks.html".into()),
                )
                .title("Mochi Tasks")
                .inner_size(320.0, 430.0)
                .min_inner_size(260.0, 300.0)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .shadow(false)
                .resizable(false)
                .build();
                match window {
                    Ok(window) => {
                        position_tasks_near_cat(&app, &window);
                        let _ = window.set_focus();
                    }
                    Err(error) => {
                        eprintln!("mochi: failed to open tasks window: {error}");
                    }
                }
            });
        }
    }
}

/// Anchors the tasks widget beside the cat window: right side with a small
/// gap, vertically centered on the cat; flips to the left near the right
/// screen edge and always stays within the monitor bounds.
fn position_tasks_near_cat(app: &tauri::AppHandle, tasks: &tauri::WebviewWindow) {
    let Some(cat) = app.get_webview_window("main") else {
        return;
    };
    let Ok(cat_pos) = cat.outer_position() else {
        return;
    };
    let cat_size = cat.outer_size().unwrap_or_else(|_| tauri::PhysicalSize::new(176, 176));
    let size = tasks
        .outer_size()
        .unwrap_or_else(|_| tauri::PhysicalSize::new(320, 430));
    let gap = 8;
    let mut x = cat_pos.x + cat_size.width as i32 + gap;
    if let Some(monitor) = cat.current_monitor().ok().flatten() {
        let mon_pos = monitor.position();
        let mon_size = monitor.size();
        let mon_x = mon_pos.x;
        let mon_y = mon_pos.y;
        let mon_right = mon_x + mon_size.width as i32;
        let mon_bottom = mon_y + mon_size.height as i32;
        if x + size.width as i32 > mon_right {
            x = cat_pos.x - gap - size.width as i32;
        }
        let max_x = (mon_right - size.width as i32).max(mon_x);
        let max_y = (mon_bottom - size.height as i32).max(mon_y);
        let y = cat_pos.y + (cat_size.height as i32 - size.height as i32) / 2;
        let _ = tasks.set_position(tauri::PhysicalPosition::new(x.clamp(mon_x, max_x), y.clamp(mon_y, max_y)));
        return;
    }
    let _ = tasks.set_position(tauri::PhysicalPosition::new(x, cat_pos.y));
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            exit_app,
            log_line,
            toggle_settings_window,
            toggle_tasks_window
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show cat", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide cat", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let tasks_item = MenuItem::with_id(app, "tasks", "Tasks", true, None::<&str>)?;
            let exit = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&show, &hide, &sep1, &tasks_item, &settings, &sep2, &exit])?;

            let mut tray = TrayIconBuilder::with_id("mochi-tray")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "tasks" => toggle_tasks_window(app.clone()),
                    "settings" => toggle_settings_window(app.clone()),
                    "exit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }
            tray.build(app)?;

            // Closing either window only hides it (tray pet style); the
            // app exits through the tray/exit menu item.
            for label in ["main", "settings"] {
                if let Some(window) = app.get_webview_window(label) {
                    let handle = window.clone();
                    window.on_window_event(move |event| {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            let _ = api.prevent_close();
                            let _ = handle.hide();
                        }
                    });
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running mochi");
}
