class NodeRedProperties {
    constructor (node, config, properties) {
        // the node that creates it
        this.node = node;

        // object with property names for the keys. The values are objects with properties similar to the 'defaults' propery used by RED.nodes.registerType
        this.properties = properties || {};

        this.contextNames = {};
        this.contextName = 'node';
        this.init(config);
    }

    init (config) {
        const configs = Object.keys(this.properties);
        for (const c of configs) {
            const property = this.properties[c];
            if (!property) {
                continue;
            }
            if (c in config) {
                this.setRaw(c, config[c]);
            } else if ('value' in property) {
                this.setRaw(c, property.value);
            }
        }
    }

    // return true if one of the inputs matched
    input (msg) {
        // only check the properties if the topic/payload doesn't match
        let match = this.inputPayload(msg);
        if (!match) {
            match = this.inputProperties(msg);
        }
        return match;
    }

    inputProperties (msg) {
        let match = false;
        for (const property in this.properties) {
            if (property in msg) {
                const val = msg[property];
                this.set(property, val, msg);
                match = true;
            }
        }
        return match;
    }

    inputPayload (msg) {
        let match = false;
        for (const property in this.properties) {
            if (msg.topic === property) {
                this.set(property, msg.payload, msg);
                match = true;
            }
        }
        return match;
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

    setContext (contextName, key) {
        if (!['node', 'flow', 'global'].includes(contextName)) {
            this.node.warn(contextName + ' is not an allowed context');
            return;
        }

        if (key && !Object.keys(this.properties).includes(key)) {
            this.node.warn(key + ' is not a property');
        }

        const prev = this.get(key);
        if (key) {
            this.contextNames[key] = contextName;
        } else {
            this.contextName = contextName;
        }
        this.setRaw(key, prev);
    }

    getContext (key) {
        const contextName = this.contextNames[key] || this.contextName;
        const nodeContext = this.node.context();
        if (contextName === 'node') {
            return nodeContext;
        } else {
            return nodeContext[contextName];
        }
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
        this.getContext(key).set(key, val);
    }

    get (key) {
        if (!Object.keys(this.properties).includes(key)) {
            this.node.warn(key + ' is not a property');
            return;
        }
        return this.getContext(key).get(key);
    }
}

module.exports = { NodeRedProperties };
