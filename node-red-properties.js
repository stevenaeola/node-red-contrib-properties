class NodeRedProperties {
    constructor (node, config, properties) {
        // the node that creates it
        this.node = node;
        // object with property names for the keys. The values are objects with properties similar to the 'defaults' propery used by RED.nodes.registerType

        this.properties = properties || {};
        this.init(config);
    }

    // might not be a good idea to run this after handlers have been set up as each of the properties will be set in turn, triggering the handlers
    init (config) {
        const configs = Object.keys(this.properties);
        for (const c of configs) {
            const property = this.properties[c];
            if (!property) {
                continue;
            }
            if (c in config) {
                this.set(c, config[c]);
            } else if ('value' in property) {
                this.set(c, property.value);
            }
        }
    }

    input (msg) {
        this.inputProperties(msg);
        this.inputPayload(msg);
    }

    inputProperties (msg) {
        for (const property in this.properties) {
            if (property in msg) {
                const val = msg[property];
                this.set(property, val, msg);
            }
        }
    }

    inputPayload (msg) {
        for (const property in this.properties) {
            if (msg.topic === property) {
                this.set(property, msg.payload, msg);
            }
        }
    }

    // define a function to handle the setting of a property
    // if the property is undefined then apply the handler to all properties
    // a handler function takes the value, the message and the property name

    handle (handler, key, prepost) {
        if ((typeof handler) !== 'function') {
            this.node.warn('handler for ' + key + ' is not a function');
            return;
        }

        if (!['pre', 'post'].includes(prepost)) {
            prepost = '';
        }

        if (Array.isArray(key)) {
            for (const key_ of key) {
                this.handle(handler, key_, prepost);
            }
            return;
        }

        if (key && !Object.keys(this.properties).includes(key)) {
            this.node.warn(key + ' is not a property');
            return;
        }

        if (key) {
            const property = this.properties[key];
            property[prepost + 'handler'] = handler;
        } else {
            this[prepost + 'handler'] = handler;
        }
    }

    preHandle (handler, key) {
        this.handle(handler, key, 'pre');
    }

    postHandle (handler, key) {
        this.handle(handler, key, 'post');
    }

    set (key, val, msg) {
        if (!Object.keys(this.properties).includes(key)) {
            this.node.warn(key + ' is not a property');
            return;
        }

        const property = this.properties[key];

        for (const handlerprop of ['prehandler', 'handler', 'posthandler']) {
            if ((typeof property[handlerprop]) === 'function') {
                property[handlerprop](val, msg, key);
            } else if ((typeof this[handlerprop]) === 'function') {
                this[handlerprop](val, msg, key);
            } else {
                if (handlerprop === 'handler') {
                    this.setRaw(key, val);
                }
            }
        }
    }

    setRaw (key, val) {
        if (!Object.keys(this.properties).includes(key)) {
            this.node.warn(key + ' is not a property');
            return;
        }
        this.node[key] = val;
    }

    get (key) {
        if (!Object.keys(this.properties).includes(key)) {
            this.node.warn(key + ' is not a property');
            return;
        }
        return this.node[key];
    }
}

module.exports = { NodeRedProperties };
