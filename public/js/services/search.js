angular.module("searchM", [])
    .service("search_s", function() {
        let _$scope, _$http, _$timeout, _$paging, _preloader;

        this.init = ($scope, $http, $timeout, preloader) => {
            _$http = $http;
            _$scope = $scope;
            _$timeout = $timeout;
            _preloader = preloader;

            _$scope.search = (force_update) => {
                let route;
                switch (_$scope.versions_filter_select_model) {
                    case "equal":
                        route = "/api/versions/";
                        break;

                    case "after":
                        route = "/api/versions/gt_";
                        break;

                    case "before":
                        route = "/api/versions/lt_";
                        break;
                }
                let deferred = $.Deferred();

                if (_$scope.version_data_filter_model) {
                    let data;
                    switch (_$scope.versions_filter_type_select_model) {
                        case "ver":
                            route += "v";
                            data = _$scope.version_data_filter_model;
                            break;

                        case "desc":
                            route += "desc-";
                            data = _$scope.version_data_filter_model;
                            break;

                        case "date":
                            alertify.error("Error occurred in client side: Date filter detected but didn't applied correctly.");
                            break;
                    }
                    route += data;
                } else if ($("#filter_version_release_date").val()) {
                    route += "d";
                    route += new Date($("#filter_version_release_date").val() + "EDT");
                    //let extracted_date_data = date_data.split(['-', '/', '.', ' ']);
                    //let formatted_date = extracted_date_data// yyyy-mm-dd
                } else {
                    route = "/api/versions/all";
                }

                if (force_update) {
                    _preloader.start();
                }

                let new_versions_list;
                _$http({
                    method: "GET",
                    url: route,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then((response) => {
                    response = response.data;
                    let versions_table = $("#versions_table"); // Cancel table animation for same data
                    versions_table.removeClass('animated'); // Cancel table animation for same data
                    new_versions_list = response.data;
                    if (!$scope.versions_table_conf.version_update_lock && !$scope.versions_table_conf.property_update_lock) {
                        $scope.version_edit_progress = {
                            is_active: false,
                            version: ""
                        };
                    }
                    new_versions_list.forEach((version) => {
                        let date_info = version.release_date.split('T');
                        let date = new Date(date_info[0] + " EDT");
                        let splitter = '-';
                        version.release_date = date.getDate() + splitter + (date.getMonth() + 1) + splitter + date.getFullYear();
                        version.view_state = true;
                        version.properties_current_page = 1;
                        version.properties.forEach((property) => {
                            property.view_state = true;
                        });
                    });
                    if (force_update || !$scope.versions_table_conf.version_update_lock && !$scope.versions_table_conf.property_update_lock) {
                        if (force_update || !_$scope.versions_list || new_versions_list.length !== _$scope.versions_list.length ||
                            (new_versions_list && new_versions_list.length && new_versions_list[0].version !== _$scope.versions_list[0].version)) {
                            // TODO: in description search, there is significance to the order, think of a way to detect results order changing
                            versions_table.addClass('animated'); // Apply table animation for new data
                            _$scope.versions_list = new_versions_list;
                            alertify.success(response.message);
                        }
                    }
                }, (response) => {
                    let msg;
                    if (response.data) {
                        response = response.data;
                        msg = response.message;
                    } else {
                        msg = "Connection error";
                    }
                    alertify.error(msg);
                }).finally(() => {
                    _preloader.stop();
                    _$timeout(() => {
                        _$scope.search();
                    }, 2000);

                    deferred.resolve("Search ended");
                    /* To wait to finally state, use:
                    $scope.search()
                    .done(
                        after_search.bind(null, param1, param2, ...)
                    );*/
                });
                return deferred.promise();
            };

            _$scope.clear_search = () => {
                _$scope.version_data_filter_model = "";
                _$scope.version_date_data_filter_model = "";
                let version_rel_date_filter = $("#filter_version_release_date");
                version_rel_date_filter.val("");
                version_rel_date_filter.trigger("change");
                _$scope.search();
            };

            _$scope.change_data_input_type = () => {
                switch (_$scope.versions_filter_type_select_model) {
                    case "ver":
                    case "desc":
                        _$scope.versions_filter_select_model = "equal";
                        $("#versions_version_type_filter_select").val(_$scope.versions_filter_select_model); // should auto update
                        break;

                    case "date":
                        _$scope.versions_filter_select_model = "before";
                        $("#versions_date_type_filter_select").val(_$scope.versions_filter_select_model); // should auto update
                        break;
                }
                $('select').formSelect();
                _$scope.clear_search();
            };

            _$scope.search_version = (version_id) => {
                _$scope.versions_filter_type_select_model = 'ver';
                _$scope.version_data_filter_model = version_id;
                _$scope.versions_filter_select_model = "equal";
                scroll_to_top();
                _$scope.search();
            };

            _$http({method: "GET", url: "/guidance_bases"}).then((response) => {
                _$scope.guidance_bases_list = response.data.data;
                /*$timeout(() => {
                    $('[name="optional_guidance_bases"]').formSelect();
                }, 500);*/
            });
        };

        this.update_last_version = () => {
            _$http({
                method: "GET",
                url: "/api/versions/all",
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then((response) => {
                response = response.data;
                let versions_list = response.data;
                versions_list.sort((elem1, elem2) => {
                    if (elem1.version > elem2.version) return -1;
                    if (elem1.version < elem2.version) return 1;
                    return 0;
                });
                _$scope.last_version = versions_list[0];
            }, (response) => {
                response = response.data;
                alertify.error(response.message);
            });
        }
    });