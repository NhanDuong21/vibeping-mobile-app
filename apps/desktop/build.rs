use std::{
    collections::hash_map::DefaultHasher,
    env, fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
};

fn main() {
    let manifest = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("manifest directory"));
    let web_root = manifest.join("../mobile/dist/vibeping-mobile/browser");
    println!("cargo:rerun-if-changed={}", web_root.display());

    if env::var("PROFILE").as_deref() == Ok("release") && !web_root.join("index.html").is_file() {
        panic!("Build the Angular production application before the Rust release binary");
    }

    let mut hasher = DefaultHasher::new();
    hash_tree(&web_root, &mut hasher);
    println!(
        "cargo:rustc-env=VIBEPING_WEB_ASSET_REVISION={:x}",
        hasher.finish()
    );
}

fn hash_tree(root: &Path, hasher: &mut DefaultHasher) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    let mut paths = entries
        .flatten()
        .map(|entry| entry.path())
        .collect::<Vec<_>>();
    paths.sort();
    for path in paths {
        path.hash(hasher);
        if path.is_dir() {
            hash_tree(&path, hasher);
        } else if let Ok(bytes) = fs::read(path) {
            bytes.hash(hasher);
        }
    }
}
