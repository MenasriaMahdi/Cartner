use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};

/// Designed context-menu popup: a tiny transparent window that draws its own
/// card, so it can be styled like the rest of the app while still being free
/// of the cat window's bounds (and never covering the cat).
const MENU_WIDTH: f64 = 208.0;
const MENU_HEIGHT: f64 = 252.0;
/// Transparent gutter inside the popup window that the card shadow lives in.
const MENU_MARGIN: f64 = 6.0;

#[derive(Clone, serde::Serialize)]
struct MenuState {
    drink: bool,
    eat: bool,
    mood: String,
}

/// The state the cat window handed over when it opened the menu. The menu
/// webview reads it once on load; nothing polls.
static MENU_STATE: Mutex<Option<MenuState>> = Mutex::new(None);

/// Opens the designed menu popup at the cursor. The window is built on a
/// background thread (building webviews on the main thread deadlocks) and
/// destroyed on close, so it costs nothing while unused.
#[tauri::command]
fn open_cat_menu(app: tauri::AppHandle, drink: bool, eat: bool, mood: String) {
    if let Ok(mut state) = MENU_STATE.lock() {
        *state = Some(MenuState {
            drink,
            eat,
            mood,
        });
    }
    let replacing = if let Some(existing) = app.get_webview_window("menu") {
        let _ = existing.close();
        true
    } else {
        false
    };

    std::thread::spawn(move || {
        if replacing {
            // Let the closed popup release the window label first.
            std::thread::sleep(std::time::Duration::from_millis(150));
        }

        let window = WebviewWindowBuilder::new(&app, "menu", WebviewUrl::App("menu.html".into()))
            .title("Cartner Menu")
            .inner_size(MENU_WIDTH, MENU_HEIGHT)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .shadow(false)
            .resizable(false)
            .visible(false)
            .build();

        match window {
            Ok(window) => {
                position_menu_at_cursor(&app, &window);
                let _ = window.show();
                let _ = window.set_focus();
                // Dismiss like a real context menu: focus elsewhere closes it.
                let handle = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        let _ = handle.close();
                    }
                });
            }
            Err(error) => eprintln!("mochi: failed to open the menu window: {error}"),
        }
    });
}

/// Anchors the card's top-left corner at the cursor, flipping it left/up near
/// the screen edges. Uses physical pixels, so HiDPI screens line up too.
fn position_menu_at_cursor(app: &tauri::AppHandle, window: &tauri::WebviewWindow) {
    let Ok(cursor) = app.cursor_position() else {
        return;
    };
    let monitor = app.monitor_from_point(cursor.x, cursor.y).ok().flatten();
    let scale = monitor
        .as_ref()
        .map(|monitor| monitor.scale_factor())
        .unwrap_or_else(|| window.scale_factor().unwrap_or(1.0));
    let size = window.outer_size().unwrap_or_else(|_| {
        PhysicalSize::new(
            (MENU_WIDTH * scale).round() as u32,
            (MENU_HEIGHT * scale).round() as u32,
        )
    });
    let margin = (MENU_MARGIN * scale).round() as i32;
    let cursor_x = cursor.x.round() as i32;
    let cursor_y = cursor.y.round() as i32;
    let mut x = cursor_x - margin;
    let mut y = cursor_y - margin;

    if let Some(monitor) = monitor {
        let mon_pos = monitor.position();
        let mon_size = monitor.size();
        let right = mon_pos.x + mon_size.width as i32;
        let bottom = mon_pos.y + mon_size.height as i32;
        if x + size.width as i32 > right {
            x = cursor_x - size.width as i32 + margin;
        }
        if y + size.height as i32 > bottom {
            y = cursor_y - size.height as i32 + margin;
        }
        x = x.clamp(mon_pos.x, (right - size.width as i32).max(mon_pos.x));
        y = y.clamp(mon_pos.y, (bottom - size.height as i32).max(mon_pos.y));
    }

    let _ = window.set_position(PhysicalPosition::new(x, y));
}

/// The menu webview asks for the state once, right after it loads.
#[tauri::command]
fn menu_state() -> MenuState {
    MENU_STATE
        .lock()
        .ok()
        .and_then(|state| state.clone())
        .unwrap_or(MenuState {
            drink: true,
            eat: true,
            mood: "normal".to_string(),
        })
}

/// A menu row was clicked: close the popup, then act as the tray would.
#[tauri::command]
fn pick_menu(app: tauri::AppHandle, action: String) {
    if let Some(window) = app.get_webview_window("menu") {
        let _ = window.close();
    }
    handle_menu_event(&app, &action);
}

#[tauri::command]
fn close_cat_menu(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("menu") {
        let _ = window.close();
    }
}

/// One handler for every menu (tray + context popup). Settings-related picks
/// are handed back to the webview, which owns the persisted state.
fn handle_menu_event(app: &tauri::AppHandle, id: &str) {
    match id {
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
        "drink" | "eat" => {
            println!("mochi: menu pick: {id}");
            if let Err(error) = app.emit("cartner:menu", id) {
                eprintln!("mochi: menu emit failed: {error}");
            }
        }
        mood if mood.starts_with("mood-") => {
            println!("mochi: menu pick: {mood}");
            if let Err(error) = app.emit("cartner:menu", mood) {
                eprintln!("mochi: menu emit failed: {error}");
            }
        }
        _ => {}
    }
}

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
                .title("Cartner Tasks")
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
    let cat_size = cat.outer_size().unwrap_or_else(|_| tauri::PhysicalSize::new(136, 126));
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
        // Single instance guard MUST be the first plugin: a second launch
        // hands control to the first process (focusing the cat), then the
        // extra process exits by itself. Dormant after startup.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            println!("mochi: second launch detected, focusing the cat");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            exit_app,
            log_line,
            toggle_settings_window,
            toggle_tasks_window,
            open_cat_menu,
            menu_state,
            pick_menu,
            close_cat_menu
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
                .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()));
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
        .expect("error while running cartner");
}
