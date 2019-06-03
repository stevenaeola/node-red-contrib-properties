class NodeRedConfigure {
    constructor (node, config, configurables) {
        // the node that creates it
        this.node = node;
        // object with property names for the keys. The values are objects with properties similar to the 'defaults' propery used by RED.nodes.registerType

        this.configurables = configurables || {};
        this.init(config);
    }

    // might not a good idea to run this after handlers have been set up as each of the properties will be set in turn, triggering the handlers
    init (config) {
        let configs = Object.keys(this.configurables);
        for (let c of configs) {
            let configurable = this.configurables[c];
            if (!configurable) {
                continue;
            }
            if(config.hasOwnProperty(c)){
                this.set(c, config[c]);
            } else if (configurable.hasOwnProperty('value')) {
                this.set(c, configurable.value);
            }
        }
    }

    input (msg) {
        this.inputProperties(msg);
        this.inputPayload(msg);
    }

    inputProperties (msg) {
        for (let property in this.configurables) {
            if (msg.hasOwnProperty(property)) {
                let val = msg[property];
                this.set(property, val);
            }
        }
    }

    inputPayload (msg) {
        for (var configurable in this.configurables) {
            if (msg.topic === configurable) {
                this.set(configurable, msg.payload);
            }
        }
    }

    // define a function to handle the setting of a property
    // if the property is undefined then apply the handler to all properties

    handle (handler, property, prepost) {
        if ((typeof handler) !== 'function') {
            this.node.warn('handler for ' + property + ' is not a function');
            return;
        }

        if (!['pre', 'post'].includes(prepost)) {
            prepost = '';
        }

        if (Array.isArray(property)) {
            for(let prop of property){
                this.handle (handler, prop, prepost);
            }
            return;
        }

        if (property && !Object.keys(this.configurables).includes(property)) {
            this.node.warn(property + ' is not configurable');
            return;
        }

        if (property) {
            const configurable = this.configurables[property];
            configurable[prepost + 'handler'] = handler;
        } else {
            this[prepost + 'handler'] = handler;
        }
    }

    preHandle (handler, property) {
        this.handle(handler, property, 'pre');
    }

    postHandle (handler, property) {
        this.handle(handler, property, 'post');
    }

    set (property, val) {
        if (!Object.keys(this.configurables).includes(property)) {
            this.node.warn(property + ' is not configurable');
            return;
        }

        const configurable = this.configurables[property];

        for (let handlerprop of ['prehandler', 'handler', 'posthandler']) {
            if ((typeof configurable[handlerprop]) === 'function') {
                configurable[handlerprop](val, property, this.node);
            } else if ((typeof this[handlerprop]) === 'function') {
                this[handlerprop](val, property, this.node);
            } else {
                if (handlerprop === 'handler') {
                    this.node[property] = val;
                }
            }
        }
    }
}

module.exports = { NodeRedConfigure };
