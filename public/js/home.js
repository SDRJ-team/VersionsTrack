angular.element(document).ready(() => {
    init_materialize();
    document.getElementById("new_version_version_release_date").valueAsDate = new Date(new Date() + " EDT");
    //document.getElementById("filter_version_release_date").valueAsDate = new Date(new Date() + " EDT");
});

const app = angular.module('global_app', ['ngSanitize', 'ngAnimate', 'pagingM', 'searchM', 'versionsM', 'versionsPropertiesM'])

    .controller('body_controller', ($scope, $http, $timeout, search_s, versions_s, properties_s, paging_s, preloader, dark_area) => {
        search_s.init($scope, $http, $timeout, preloader);
        versions_s.init($scope, $http);
        properties_s.init($scope, $http);

        $scope.num_versions_for_page_model = 2;
        $scope.num_properties_for_page_model = 3;
        paging_s.init($scope, preloader, dark_area);

        $scope.versions_table_conf = {
            version_update_lock: false,
            properties_update_lock: false
        };
        $(document).ready(() => {
            $scope.search();
            $('.modal').modal();
            $("#new_version_modal").modal({
                onOpenStart: () => {
                    search_s.update_last_version()
                }
            });
            $("#new_version_version_release_date, #filter_version_release_date").on("change", function() {
                this.setAttribute(
                    "data-date",
                    moment(this.value, "YYYY/MM/DD").format(this.getAttribute("data-date-format"))
                )
            }).trigger("change");
        });

        $scope.toggle_active_class_properties = (version_data) => {
            let p_data = $("[id='" + version_data.version + "_properties_data']");
            let p_new = $("[id='" + version_data.version + "_properties_new']");
            if (version_data.properties.length) {
                p_data.addClass('active');
                p_new.removeClass('active');
            } else {
                p_data.removeClass('active');
                p_new.addClass('active');
            }
            init_materialize();
        };

        $scope.$watchGroup(['versions_pages_count', 'versions_current_page'], () => {
            $("[name='versions_pagination']").materializePagination({
                align: 'center',
                lastPage: $scope.versions_pages_count,
                firstPage:  1,
                useUrlParameter: false,
                currentPage: $scope.versions_current_page,
                onClickCallback: function(requestedPage){
                    $scope.versions_current_page = requestedPage;
                    preloader.start();
                    scroll_to_top();
                }
            });
        })
        /*global_reports_s.init($scope, $http, $timeout, $compile, reports_optional_status, preloader, soldiers_reports_s, buildings_reports_s);
        users_s.init($scope, $http, $timeout);
        guidance_bases_s.init($scope, $http, $timeout, $compile);
        paging.init($scope);

        let plus_button = {
            actions: {
                click: () => {
                    $scope.buildings.clear_report_modal();
                    $scope.soldiers.clear_report_modal();
                }
            },
            classes: [
                "modal-trigger"
            ],
            attributes: {
                "data-target": "choose_plus_modal"
            }
        };
        angular_init_users_pages($scope, dark_area, plus_button);*/
    })

    .directive('versionsUpdateD', function() { // After loading the versions run this directive
        return function($scope, preloader) {
            if ($scope.$last){
                init_materialize();
                $("input")
                    .filter(function() {
                        return this.id.match(/modify_version_release_date_*/);
                    }).each(function() {
                        $(this).on("change", function() {
                            this.setAttribute(
                                "data-date",
                                moment(this.value, "YYYY/MM/DD").format(this.getAttribute("data-date-format"))
                            )
                        }).trigger("change");
                    }
                );
            }
        };
    })

    .directive('propertiesUpdateD', function() { // After loading the versions run this directive
        return {
            restrict: 'A',
            scope: {
                callback: '&toggleActiveClass'
            },
            link: function(scope, element, attrs) {
                // Toggle active class
                scope.callback()
            }
        }
    })

    .service("preloader", function() {
        this.start = () => {
            $(".circular-preloader").addClass("active");
            //$(".preloader_status").addClass("progress");
        };

        this.stop = () => {
            $(".circular-preloader").removeClass("active");
            //$(".preloader_status").removeClass("progress");
        };
    })

    .service("dark_area", function() {
        this.is_dismiss_on = true;
        this.show = () => {
            $(".dismiss_area").addClass("on");
        };

        this.hide = () => {
            $(".dismiss_area").removeClass("on");
        };

        $(".dismiss_area").click(function() {
            if (is_dismiss_on) {
                $(".sidenav").sidenav("close");
                $(".dismiss_area").removeClass("on");
            }
        });

        this.turn_on_dismiss = () => {
            is_dismiss_on = true;
        };

        this.turn_off_dismiss = () => {
            is_dismiss_on = false;
        };
    })

    .factory('skipReload', [
        '$route',
        '$rootScope',
        function ($route, $rootScope) {
            return function () {
                var lastRoute = $route.current;
                var un = $rootScope.$on('$locationChangeSuccess', function () {
                    $route.current = lastRoute;
                    un();
                });
            };
        }
    ])

    .run(function($animate) {
        $animate.enabled(true);
    });