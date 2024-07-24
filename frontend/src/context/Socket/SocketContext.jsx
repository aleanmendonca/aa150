import React, {createContext} from "react";
import openSocket from "socket.io-client";
import {isExpired} from "react-jwt";
import toastError from "../../errors/toastError";
import useAuth from "../../hooks/useAuth.js";
import {AuthContext} from "../Auth/AuthContext";

class ManagedSocket {
    constructor(socketManager) {
        console.log("ManagedSocket constructor")
        this.socketManager = socketManager;
        this.rawSocket = socketManager.currentSocket;
        this.callbacks = [];
        this.joins = [];


    }

    on(event, callback) {
        if (event === "ready" || event === "connect") {
            return this.socketManager.onReady(callback);
        }
        this.callbacks.push({event, callback});
        return this.rawSocket.on(event, callback);
    }

    off(event, callback) {
        const i = this.callbacks.findIndex((c) => c.event === event && c.callback === callback);
        this.callbacks.splice(i, 1);
        return this.rawSocket.off(event, callback);
    }

    emit(event, ...params) {
        if (event.startsWith("join")) {
            this.joins.push({event: event.substring(4), params});
        }
        return this.rawSocket.emit(event, ...params);
    }

    disconnect() {
        console.log("disconnecting socket");
        for (const j of this.joins) {
            this.rawSocket.emit(`leave${j.event}`, ...j.params);
        }
        this.joins = [];
        for (const c of this.callbacks) {
            this.rawSocket.off(c.event, c.callback);
        }
        this.callbacks = [];

    }
}

class DummySocket {
    constructor() {
        console.log("DummySocket constructor")
    }
    on(..._) {
    }

    off(..._) {
    }

    emit(..._) {
    }

    disconnect() {
    }
}

const SocketContext = createContext()


const socketManager = {
    currentCompanyId: -1,
    currentUserId: -1,
    currentSocket: null,
    socketReady: false,

    socketInstance: null,

    GetSocket: function (companyId, userId = null) {

        console.log("GET SOCKET " + companyId + " " + userId)

        if (userId != null && localStorage.getItem("userId")) {
            userId = localStorage.getItem("userId");
        }

        if (!companyId && !this.currentSocket) {
            this.socketInstance = null;
            return new DummySocket();
        }

        if (companyId && typeof companyId !== "string") {
            companyId = `${companyId}`;
        }

        if (companyId !== this.currentCompanyId || userId !== this.currentUserId) {
            if (this.currentSocket) {
                console.warn("closing old socket - company or user changed");
                this.currentSocket.removeAllListeners();
                this.currentSocket.disconnect();
                this.currentSocket = null;
                this.currentCompanyId = null;
                this.currentUserId = null;
            }

            let token = JSON.parse(localStorage.getItem("token"));

            if (isExpired(token)) {
                console.warn("Expired token, waiting for refresh");
                setTimeout(() => {
                    const currentToken = JSON.parse(localStorage.getItem("token"));
                    if (isExpired(currentToken)) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("companyId");
                    }
                    window.location.reload();
                }, 1000);

                console.warn("returning dummy socket");

                this.socketInstance = null;
                return new DummySocket();
            }

            this.currentCompanyId = companyId;
            this.currentUserId = userId;

            if (!token) {
                console.warn("No token, returning dummy socket");
                this.socketInstance = null;
                return new DummySocket();
            }

            this.currentSocket = openSocket(process.env.REACT_APP_BACKEND_URL, {
                transports:  ["polling", "websocket"],
                pingTimeout: 18000,
                reconnection: true,
                reconnectionDelay: 2000,
                reconnectionAttempts: 999,
                pingInterval: 18000,
                query: {token},
            });

            this.currentSocket.io.on("reconnect_attempt", () => {
                console.log("reconnect_attempt")
                this.currentSocket.io.opts.query.r = 1;
                token = JSON.parse(localStorage.getItem("token"));
                if (isExpired(token)) {
                    console.warn("Refreshing");
                    window.location.reload();
                } else {
                    console.warn("Using new token");
                    this.currentSocket.io.opts.query.token = token;
                }
            });

            this.currentSocket.on("disconnect", (reason) => {
                console.warn(`socket disconnected because: ${reason}`);
                if (reason.startsWith("io server disconnect")) {
                    console.warn("tryng to reconnect", this.currentSocket);
                    token = JSON.parse(localStorage.getItem("token"));

                    if (isExpired(token)) {
                        console.warn("Expired token - refreshing");
                        window.location.reload();
                        return;
                    }
                    console.warn("Reconnecting using refreshed token");
                    this.currentSocket.io.opts.query.token = token;
                    this.currentSocket.io.opts.query.r = 1;
                    this.currentSocket.connect();
                }
            });

            this.currentSocket.on("connect", (...params) => {
                console.warn("socket connected", params);
            })

            this.currentSocket.onAny((event, ...args) => {
                console.debug("Event: ", {socket: this.currentSocket, event, args});
            });

            this.onReady(() => {
                this.socketReady = true;
            });

        }

        if (this.socketInstance) {
            this.socketInstance.rawSocket = this.currentSocket;
            return this.socketInstance;
        }

        return this.socketInstance = new ManagedSocket(this);
    },

    onReady: function (callbackReady) {

        if (!this.currentSocket) {


            console.log("socket not ready")
            return
        }
        if (this.socketReady || this.currentSocket.connected) {
            console.log('socket ready called')
            callbackReady();
            return
        }


        this.currentSocket.on("connect", (...params) => {
            console.warn("socket connected 3");
            if (this.currentSocket.io.opts.query?.r) {

                console.log(this.socketInstance.joins);

                for (const j of this.socketInstance.joins) {
               //     console.debug("refreshing join", j);
                    this.currentSocket.emit(`join${j.event}`, ...j.params);
                }

                for (const j of this.socketInstance.callbacks) {
                    this.currentSocket.off(j.event, j.callback);
                    this.currentSocket.on(j.event, j.callback);
                }

            }
            callbackReady();

        })

    },

    onConnect: function (callbackReady) {
        this.onReady(callbackReady)
    },

};

export {SocketContext, socketManager};