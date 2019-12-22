exports.min_access_required = {
    create_new_version: 3,
    create_new_property: 3,
    modify_version: 3,
    modify_property: 3,
    delete_version: 3,
    delete_property: 3,
    view_profile: 1,
    modify_current_user: 1,
    view_admin_panel: 4,
    view_users_details: 4,
    create_new_user_with_specific_role: 4,
    modify_all_users: 4,
    delete_different_users: 4,
    delete_all_users: 4 // Delete all users in one shot -- Recreate admin user (admin@admin)
};