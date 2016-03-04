﻿/// <reference path="jquery-1.4.1.js" />

/*!
** Unobtrusive Ajax support library for jQuery
** Copyright (C) Microsoft Corporation. All rights reserved.
*/

/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true, strict: false */
/*global window: false, jQuery: false */

(function ($) {
    var data_click = "unobtrusiveAjaxClick",
        data_validation = "unobtrusiveValidation";

    function getFunction(code, argNames) {
        var fn = window, parts = (code || "").split(".");
        while (fn && parts.length) {
            fn = fn[parts.shift()];
        }
        if (typeof (fn) === "function") {
            return fn;
        }
        argNames.push(code);
        return Function.constructor.apply(null, argNames);
    }

    function isMethodProxySafe(method) {
        return method === "GET" || method === "POST";
    }

    function asyncOnBeforeSend(xhr, method) {
        if (!isMethodProxySafe(method)) {
            xhr.setRequestHeader("X-HTTP-Method-Override", method);
        }
    }

    function asyncOnSuccess(element, data, contentType) {
        var mode;

        if (contentType.indexOf("application/x-javascript") !== -1) {  // jQuery already executes JavaScript for us
            return;
        }

        mode = (element.getAttribute("data-ajax-mode") || "").toUpperCase();
        $(element.getAttribute("data-ajax-update")).each(function (i, update) {
            var top;

            switch (mode) {
                case "BEFORE":
                    top = update.firstChild;
                    $("<div />").html(data).contents().each(function () {
                        update.insertBefore(this, top);
                    });
                    break;
                case "AFTER":
                    $("<div />").html(data).contents().each(function () {
                        update.appendChild(this);
                    });
                    break;
                default:
                    $(update).html(data);
                    break;
            }
        });
    }

    function asyncRequest(element, options) {
        var confirm, loading, method, duration;

        confirm = element.getAttribute("data-ajax-confirm");
        if (confirm && !window.confirm(confirm)) {
            return;
        }

        loading = $(element.getAttribute("data-ajax-loading"));
        duration = element.getAttribute("data-ajax-loading-duration") || 0;

        $.extend(options, {
            type: element.getAttribute("data-ajax-method") || undefined,
            url: element.getAttribute("data-ajax-url") || undefined,
            beforeSend: function (xhr) {
                var result;
                asyncOnBeforeSend(xhr, method);
                result = getFunction(element.getAttribute("data-ajax-begin"), ["xhr"]).apply(this, arguments);
                if (result !== false) {
                    loading.show(duration);
                }
                return result;
            },
            complete: function () {
                loading.hide(duration);
                getFunction(element.getAttribute("data-ajax-complete"), ["xhr", "status"]).apply(this, arguments);
            },
            success: function (data, status, xhr) {
                asyncOnSuccess(element, data, xhr.getResponseHeader("Content-Type") || "text/html");
                getFunction(element.getAttribute("data-ajax-success"), ["data", "status", "xhr"]).apply(this, arguments);              
            },
            error: getFunction(element.getAttribute("data-ajax-failure"), ["xhr", "status", "error"]),
            cache: false
        });

        options.data.push({ name: "X-Requested-With", value: "XMLHttpRequest" });

        method = options.type.toUpperCase();
        if (!isMethodProxySafe(method)) {
            options.type = "POST";
            options.data.push({ name: "X-HTTP-Method-Override", value: method });
        }

        $.ajax(options);
    }

    function validate(form) {
        var validationInfo = $(form).data(data_validation);
        return !validationInfo || !validationInfo.validate || validationInfo.validate();
    }

    $("a[data-ajax=true]").live("click", function (evt) {
        evt.preventDefault();
        asyncRequest(this, {
            url: this.href,
            type: "GET",
            data: []
        });
    });

    $("form[data-ajax=true] input[type=image]").live("click", function (evt) {
        var name = evt.target.name,
            $target = $(evt.target),
            form = $target.parents("form")[0],
            offset = $target.offset();

        $(form).data(data_click, [
            { name: name + ".x", value: Math.round(evt.pageX - offset.left) },
            { name: name + ".y", value: Math.round(evt.pageY - offset.top) }
        ]);

        setTimeout(function () {
            $(form).removeData(data_click);
        }, 0);
    });

    $("form[data-ajax=true] :submit").live("click", function (evt) {

        var validateStr = this.getAttribute("data-ajax-validate");
        if (validateStr) {
            var r = eval(validateStr);
            if (r) {
                alert(r);
                return false;
            }
        }

        var comfirmStr = this.getAttribute("data-ajax-confirm");
        if (comfirmStr) {
            if (confirm(comfirmStr) == false) {
                return false;
            }
        }

        var runMethodOrValue, s, Sys = {};
        var browserName = navigator.userAgent.toLowerCase(); //判断浏览器类型       
        (s = browserName.match(/msie ([\d.]+)/)) ? Sys.ie = s[1] :
           (s = browserName.match(/chrome\/([\d.]+)/)) ? Sys.chrome = s[1] : 0;
        if (Sys.ie)
            runMethodOrValue = evt.target.runMethod; //ie下的自定义runMethod值
        else
            runMethodOrValue = evt.target.value; //非ie下的value值
        var name = evt.target.name;
        form = $(evt.target).parents("form")[0];
        var data = name ? [{ name: name, value: runMethodOrValue}] : [{}];

        var extra = this.getAttribute("data-ajax-extra");
        if (extra) {
            data = data.concat(eval(extra));
        }

        $(form).data(data_click, data);

        setTimeout(function () {
            $(form).removeData(data_click);
        }, 0);
    });

    $("form[data-ajax=true]").live("submit", function (evt) {
        var clickInfo = $(this).data(data_click) || [];
        evt.preventDefault();
        if (!validate(this)) {
            return;
        }
        asyncRequest(this, {
            url: $(this).attr("action"),
            type: $(this).attr("method") || "GET",
            data: clickInfo.concat($(this).serializeArray())
        });
    });

    /**/
    $("select[data-ajax=true]").live("change", function (evt) {
        var method = $(this).attr("data-ajax-method");
        if (method == "change-page" || method == "change-page-size") {
            var url = $('option[value=' + $(this).val() + ']', $(this)).attr('data-ajax-url');
            asyncRequest(this, {
                url: url,
                type: "GET",
                data: []
            });
        }
    });
} (jQuery));