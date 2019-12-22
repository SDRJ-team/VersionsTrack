angular.element(document).ready(() => {
    init_materialize();
    document.getElementById("new_version_version_release_date").valueAsDate = new Date(new Date() + " EDT");
    //document.getElementById("filter_version_release_date").valueAsDate = new Date(new Date() + " EDT");
});

const app = angular.module('global_app', ['ngSanitize', 'ngAnimate', 'pagingM', 'searchM', 'versionsM', 'versionsPropertiesM', 'modalsM', 'loaderM'])

    .controller('body_controller', ($scope, $http, $timeout, search_s, versions_s, properties_s, paging_s, modals_s, preloader, dark_area) => {
        search_s.init($scope, $http, $timeout, preloader);
        versions_s.init($scope, $http, modals_s);
        properties_s.init($scope, $http);
        modals_s.init($scope, preloader, dark_area);

        $scope.num_versions_for_page_model = 2;
        $scope.num_properties_for_page_model = 3;
        paging_s.init($scope, preloader, dark_area);

        ng_init_sidenav(dark_area);

        $scope.versions_table_conf = {
            version_update_lock: false,
            properties_update_lock: false
        };
        $(document).ready(() => {
            $scope.search();
            $('.modal').modal({
                startingTop: '5%',
                endingTop: '15%'
            });
            $("#new_version_modal").modal({
                startingTop: '5%',
                endingTop: '15%',
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
            $timeout(() => {
                init_materialize();
            }, 100);
        };
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