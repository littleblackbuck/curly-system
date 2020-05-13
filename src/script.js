(() => {
    let code = null, autoLogin = null;

    class Fs {
        static fileExists(path) {
            return new Promise((resolve) => {
                this.getFs(path).then(() => {
                    resolve(true);
                }).catch(() => {
                    resolve(false);
                });
            });
        }

        static getFile(fileName) {
            return new Promise((resolve, reject) => {
                this.getFs(fileName).then((fileEntry) => {
                    fileEntry.file((file) => {
                        const reader = new FileReader();

                        reader.onload = (e) => {
                            resolve(e.target.result);
                        };

                        reader.onerror = reject;
                        reader.readAsText(file);
                    }, reject);
                }).catch(reject);
            });
        }

        static getFs(path) {
            return new Promise((resolve, reject) => {
                resolveLocalFileSystemURL(path, resolve, reject);
            });
        }

        static writeFile(fileName, data) {
            const path = fileName.substr(0, fileName.lastIndexOf("/"));

            return new Promise((resolve, reject) => {
                this.getFs(path).then((directoryEntry) => {
                    fileName = fileName.substr(fileName.lastIndexOf("/") + 1);

                    directoryEntry.getFile(
                        fileName,
                        {
                            create: true,
                            exclusive: false
                        },
                        (fileEntry) => fileEntry.createWriter(
                            (fileWriter) => {
                                fileWriter.onwrite = resolve;
                                fileWriter.onerror = reject;
                                fileWriter.write(data);
                            },
                            reject
                        ),
                        reject
                    );
                }).catch(reject);
            });
        }
    }

    class Code {
        static get() {
            return new Promise((resolve) => {
                const path = this.getPath();

                Fs.fileExists(path).then((s) => {
                    if (s) {
                        Fs.getFile(path).then((d) => {
                            resolve(d);
                        });
                    } else {
                        resolve("");
                    }
                });
            });
        }

        static getPath() {
            return cordova.file.applicationStorageDirectory + "code";
        }

        static set(c) {
            const path = this.getPath();
            code = c;

            Fs.writeFile(path, c);
        }
    }

    class AutoLogin {
        static get() {
            return new Promise((resolve) => {
                const path = this.getPath();

                Fs.fileExists(path).then((s) => {
                    if (s) {
                        Fs.getFile(path).then((d) => {
                            resolve(parseJson(d, null));
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        }

        static getPath() {
            return cordova.file.applicationStorageDirectory + "login";
        }

        static set(c) {
            const path = this.getPath();
            code = c;

            Fs.writeFile(path, c);
        }
    }

    class Message {
        static init(iawin) {
            iawin.addEventListener("message", (e) => {
                if (e.type !== "message" || !e.data || !e.data.action) {
                    return;
                }

                switch (e.data.action) {
                    case "updateCode": {
                        Code.set(String(e.data.code));
                        break;
                    }

                    case "updateLogin": {
                        AutoLogin.set(String(e.data.login));
                        break;
                    }

                    case "exitApp": {
                        App.close();
                        break;
                    }
                }
            });
        }
    }

    class AppUrl {
        static get() {
            let url = atob("aHR0cHM6Ly93d3cuZ21sb3RvLmNvbS9hY2NvdW50L2xvZ2lu");

            if (autoLogin) {
                url = this.getLoginUrl(url, autoLogin[0], autoLogin[1]);
            }

            return url;
        }

        static escape(html) {
            return html.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        static getLoginUrl(baseUrl, uid, pass) {
            let loginUrl = "data:text/html;base64,";

            let url = atob("PCFkb2N0eXBlIGh0bWw+PG1ldGEgY2hhcnNldD11dGYtOD48dGl0bGU+Jm5ic3A7PC90aXRsZT48Zm9ybSBtZXRob2Q9IlBPU1QiIGFjdGlvbj0i");
            url += baseUrl;
            url += atob("Ij48aW5wdXQgdHlwZT0iaGlkZGVuIiBuYW1lPSJpZCIgdmFsdWU9Ig==");
            url += uid;
            url += atob("Ij48aW5wdXQgdHlwZT0iaGlkZGVuIiBuYW1lPSJwYXNzd29yZCIgdmFsdWU9Ig==");
            url += this.escape(pass);
            url += atob("Ij48L2Zvcm0+PHNjcmlwdD5kb2N1bWVudC5mb3Jtc1swXS5zdWJtaXQoKTwvc2NyaXB0Pg==");

            loginUrl += btoa(url);

            return loginUrl;
        }
    }

    class App {
        static init() {
            const url = AppUrl.get(),
            iawin = window.open(url, "_blank", "location=no,clearcache=yes,zoom=no,footer=no");

            Message.init(iawin);

            iawin.addEventListener("loaderror", () => {
                this.errorHandler();
            });

            iawin.addEventListener("exit", () => {
                this.closeHandler();
            });

            this.iawin = iawin;
            this.error = false;
        }

        static close() {
            navigator.notification.confirm("Confirm close", (exit) => {
                if (exit === 1) {
                    navigator.app.exitApp();
                } else {
                    location.reload();
                }
            }, "Confirm");
        }

        static closeHandler() {
            navigator.splashscreen.show();

            if (this.error) {
                document.querySelector("#error").classList.remove("hide");
            } else {
                this.close();
            }

            navigator.splashscreen.hide();
        }

        static errorHandler() {
            this.error = true;
            navigator.splashscreen.show();
            this.iawin.close();
        }
    }

    function parseJson(data, defaultValue) {
        var obj;

        try {
            obj = JSON.parse(data);
        } catch (e) {
            obj = defaultValue;
        }

        return obj;
    }

    function errorHandler() {
        document.querySelector("#error .btn-d").addEventListener("click", () => {
            navigator.splashscreen.show();
            location.reload();
        });
    }

    function hideCalculator() {
        document.querySelector(".calculator").classList.add("hide");
    }

    function numberHandler(currentInput) {
        if (code === "" || currentInput === code) {
            hideCalculator();
            App.init();
        }
    }

    function init() {
        Code.get().then((c) => {
            code = c;
        });

        AutoLogin.get().then((l) => {
            autoLogin = l;
        });

        errorHandler();
        addNumberListener(numberHandler);
    }

    init();
})();
