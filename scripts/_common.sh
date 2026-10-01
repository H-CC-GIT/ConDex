#!/bin/bash

# Copy this checkout into the install dir and build the Next.js standalone server.
# The path chosen at install (domain root or a subpath) is baked into the build.

install_sources() {
    if [ -z "${YNH_APP_BASEDIR:-}" ]; then
        ynh_die "Install ConDex from a checkout: sudo yunohost app install /path/to/ConDex"
    fi

    mkdir -p "$install_dir"
    tar -C "$YNH_APP_BASEDIR" \
        --exclude node_modules \
        --exclude .next \
        --exclude data \
        --exclude .git \
        -cf - . | tar -C "$install_dir" -xf -
}

build_condex() {
    if [ "$path" = "/" ]; then
        base_path=""
    else
        base_path="${path%/}"
    fi
    ynh_app_setting_set --key=base_path --value="$base_path"

    if [ -n "${nodejs_dir:-}" ]; then
        export PATH="$nodejs_dir:$PATH"
    fi

    pushd "$install_dir"
        ynh_hide_warnings env NEXT_PUBLIC_BASE_PATH="$base_path" \
            npm ci --include=dev --no-audit --no-fund
        ynh_hide_warnings env NEXT_PUBLIC_BASE_PATH="$base_path" NODE_ENV=production \
            npm run build
    popd

    mkdir -p "$install_dir/.next/standalone/.next"
    if [ -d "$install_dir/public" ]; then
        cp -a "$install_dir/public" "$install_dir/.next/standalone/public"
    fi
    cp -a "$install_dir/.next/static" "$install_dir/.next/standalone/.next/static"
    chown -R "$app:$app" "$install_dir"
}

ensure_data_dirs() {
    mkdir -p "$data_dir/photos"
    chown -R "$app:$app" "$data_dir"
    mkdir -p "/var/log/$app"
    touch "/var/log/$app/$app.log"
    chown -R "$app:$app" "/var/log/$app"
}
