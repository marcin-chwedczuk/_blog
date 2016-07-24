(function() {
    'use strict';

    var app = angular.module('app', []);

    app
        .controller('MainController', MainController)
        .constant('FindCommandBuilder', FindCommandBuilder);


    MainController.$inject = ['$scope', 'FindCommandBuilder'];

    function MainController($scope, FindCommandBuilder) {
        var vm = this;
        init();

        vm.reset = function() {
            resetData();
            generateFindCommand();
        };

        vm.copyToClipboard = function() {
            try {
                var textarea = document.createElement('textarea');
                document.body.appendChild(textarea);

                textarea.value = vm.command || '';
                textarea.select();
                if (!document.execCommand('copy'))
                    throw new Error('execCommand copy failed!');

                document.body.removeChild(textarea);
            }
            catch(e) {
                    console.log(e);
                    alert('cannot copy: operation failed!');
            }
        };

        function init() {
            resetData();

            $scope.$watch(
                function() {
                    return vm.data;
                },
                generateFindCommand,
                /* deep watch: */
                true
            );
        }

        function resetData() {
            vm.data = {
                directory: '',
                fileType: '',
                nameMatchOpt: 'normal',
                nameIgnoreCase: false,
                fileSizeEqualUnit: 'M',
                fileSizeSmallerUnit: 'M',
                fileSizeBiggerUnit: 'M',
                permMode: 'normal',
                timeMode: 'm',
                timeExactUnit: 'days',
                timeLaterUnit: 'days',
                timeEarlierUnit: 'days'
            };
        }

        function generateFindCommand() {
            var data = vm.data;
            var builder = new FindCommandBuilder();

            builder.setDirectory(data.directory);
            builder.setFileType(data.fileType);

            builder.setFilenamePattern({
                pattern: data.namePattern,
                inverse: (data.nameMatchOpt === 'not'),
                ignoreCase: data.nameIgnoreCase
            });

            builder.setFileSizeEqual({
                size: data.fileSizeEqual,
                unit: data.fileSizeEqualUnit
            });

            builder.setFileSizeSmaller({
                size: data.fileSizeSmaller,
                unit: data.fileSizeSmallerUnit
            });

            builder.setFileSizeBigger({
                size: data.fileSizeBigger,
                unit: data.fileSizeBiggerUnit
            });

            builder.setFileOwners({
                owners: data.fileOwners,
                includeInvalid: data.includeInvalidOwners
            });

            builder.setFileGroups({
                groups: data.fileGroups,
                includeInvalid: data.includeInvalidGroups
            });

            builder.setPermissions({
                perms: data.perms,
                mode: data.permMode
            });

            builder.setFileTime({
                mode: data.timeMode,
                exact: data.timeExact,
                exactUnit: data.timeExactUnit,
                earlier: data.timeEarlier,
                earlierUnit: data.timeEarlierUnit,
                later: data.timeLater,
                laterUnit: data.timeLaterUnit
            });

            builder.setSearchDepth({
                min: data.mindepth,
                max: data.maxdepth
            });

            builder.setAction({
                print: data.doPrint,
                print0: data.doPrintZero,
                'delete': data.doDelete,
                exec: data.doExec,
                command: data.doCommand,
                confirm: data.doConfirm
            });

            vm.command = builder.getCommand();
        }
    }

    function FindCommandBuilder() {}

    FindCommandBuilder.prototype.setDirectory = function(directory) {
        if (!directory) return;
        this._directory = directory;
    }

    FindCommandBuilder.prototype.setFileType = function(fileType) {
        if (!fileType) return;
        this._fileType = fileType;
    };

    FindCommandBuilder.prototype.setFilenamePattern = function(options) {
        if (!options || !options.pattern) return;
        this._namePattern = options;
    };

    FindCommandBuilder.prototype.isSizeOptionsEmpty = function(options) {
        if (!options || (!options.size && options.size !== 0))
            return true;

        return false;
    };

    FindCommandBuilder.prototype.setFileSizeEqual = function(options) {
        if (this.isSizeOptionsEmpty(options)) return;
        this._fileSizeEqual = options;
    };

    FindCommandBuilder.prototype.setFileSizeSmaller = function(options) {
        if (this.isSizeOptionsEmpty(options)) return;
        this._fileSizeSmaller = options;
    };

    FindCommandBuilder.prototype.setFileSizeBigger = function(options) {
        if (this.isSizeOptionsEmpty(options)) return;
        this._fileSizeBigger = options;
    };

    FindCommandBuilder.prototype.setFileOwners = function(options) {
        if (!options || (!options.owners && !options.includeInvalid))
            return;

        this._fileOwners = options;
    };

    FindCommandBuilder.prototype.setFileGroups = function(options) {
        if (!options || (!options.groups && !options.includeInvalid))
            return;

        this._fileGroups = options;
    };

    FindCommandBuilder.prototype.setPermissions = function(options) {
        if (!options || !options.perms) return;

        this._filePerms = options;
    };

    FindCommandBuilder.prototype.setFileTime = function(options) {
        if (!options || (!options.exact && !options.later && !options.earlier))
            return;

        this._fileTime = options;
    };

    FindCommandBuilder.prototype.setSearchDepth = function(options) {
        if (!options || (options.min == null && options.max == null))
            return;

        this._searchDepth = options;
    };

    FindCommandBuilder.prototype.setAction = function(options) {
        if (!options) return;

        this._action = options;
    }

    FindCommandBuilder.prototype.getCommand = function() {
        var that = this;
        var cmd = 'find ';

        if (this._directory) {
            cmd += this.escapePath(this._directory) + ' ';
        }

        if (this._searchDepth) {
            if (this._searchDepth.min != null) {
                cmd += '-mindepth ' + String(this._searchDepth.min) + ' ';
            }

            if (this._searchDepth.max != null) {
                cmd += '-maxdepth ' + String(this._searchDepth.max) + ' ';
            }
        }

        if (this._fileType) {
            cmd += '-type ' + this._fileType + ' ';
        }

        if (this._namePattern) {
            var template = (this._namePattern.ignoreCase ? '-iname' : '-name') + ' %';

            cmd += (this._namePattern.inverse ? '\\! ' : '');

            // single pattern?
            if (this._namePattern.pattern.indexOf('|') === (-1)) {
                cmd += template.replace('%', this.escapePath(this._namePattern.pattern));
            } else {
                var patterns = this._namePattern.pattern.split(/\s*\|\s*/g)
                    .map(function(p) {
                        return template.replace('%', that.escapePath(p));
                    });

                cmd += '\\( ' + patterns.join(' -o ') + ' \\)';
            }

            cmd += ' ';
        }

        if (this._fileSizeEqual) {
            cmd += this.getSizeOption('', this._fileSizeEqual);
        } else {
            if (this._fileSizeBigger) {
                cmd += this.getSizeOption('+', this._fileSizeBigger);
            }

            if (this._fileSizeSmaller) {
                cmd += this.getSizeOption('-', this._fileSizeSmaller);
            }

        }

        if (this._fileOwners) {
            var owners = (this._fileOwners.owners || '')
                .split(/\s*\,\s*/g)
                .filter(function(p) {
                    return p;
                })
                .map(function(o) {
                    return '-user ' + o;
                });

            if (this._fileOwners.includeInvalid) {
                owners.push('-nouser')
            }

            if (owners.length <= 1) {
                cmd += owners.join('') + ' ';
            } else {
                cmd += '\\( ' + owners.join(' -o ') + ' \\) ';
            }
        }

        if (this._fileGroups) {
            var groups = (this._fileGroups.groups || '')
                .split(/\s*\,\s*/g)
                .filter(function(p) {
                    return p;
                })
                .map(function(o) {
                    return '-group ' + o;
                });

            if (this._fileGroups.includeInvalid) {
                groups.push('-nogroup')
            }

            if (groups.length <= 1) {
                cmd += groups.join('') + ' ';
            } else {
                cmd += '\\( ' + groups.join(' -o ') + ' \\) ';
            }
        }

        if (this._filePerms) {
            switch (this._filePerms.mode) {
                case 'not':
                    cmd += '\\! ';
                    // fall
                case 'normal':
                    cmd += '-perm ' + String(this._filePerms.perms) + ' ';
                    break;

                case 'atLeast':
                    cmd += '-perm -' + String(this._filePerms.perms) + ' ';
                    break;

                case 'common':
                    cmd += '-perm /' + String(this._filePerms.perms) + ' ';
                    break;
            }
        }

        if (this._fileTime) {
            if (this._fileTime.exact) {
                cmd += this.getTimeOpts('', this._fileTime.mode,
                    this._fileTime.exact, this._fileTime.exactUnit);
            } else {
                if (this._fileTime.earlier) {
                    cmd += this.getTimeOpts('+', this._fileTime.mode,
                        this._fileTime.earlier, this._fileTime.earlierUnit);
                }

                if (this._fileTime.later) {
                    cmd += this.getTimeOpts('-', this._fileTime.mode,
                        this._fileTime.later, this._fileTime.laterUnit);
                }
            }
        }

        if (this._action) {
            var action = this._action;

            if (action.print) {
                // print is default action
                if (action.print0 || action['delete'] || action.exec)
                    cmd += '-print ';
            }

            if (action.print0) {
                cmd += '-print0 ';
            }

            if (action['delete']) {
                cmd += '-delete ';
            }

            if (action.exec && action.command) {
                cmd += (action.confirm ? '-ok' : '-exec') + ' ' + action.command + ' \\; ';
            }
        }

        return cmd;
    };

    FindCommandBuilder.prototype.getTimeOpts = function(prefix, mode, time, unit) {
        var unitCmd = (unit == 'days') ? 'time' : 'min';

        if (unit == 'hours')
            time *= 60;

        return '-' + mode + unitCmd + ' ' + prefix + time + ' ';
    };

    FindCommandBuilder.prototype.getSizeOption = function(prefix, options) {
        return '-size ' + prefix + String(Math.floor(options.size)) + options.unit + ' ';
    };

    FindCommandBuilder.prototype.escapePath = function(path) {
        if (/^[a-zA-Z0-9/_.~]*$/.test(path)) {
            return path;
        } else {
            // we cannot escape single quote inside single quotes:
            // http://stackoverflow.com/a/1250279/1779504
            // in bash strings can be glued: 'foo''bar' == 'foobar'
            path = path.replace(/'/g, "'\"'\"'");
            return "'" + path + "'";
        }
    };

}());
