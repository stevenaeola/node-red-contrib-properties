class NodeRedProperties {
    constructor (node, config, properties) {
        // the node that creates it
        this.node = node;
        // object with property names for the keys. The values are objects with properties similar to the 'defaults' propery used by RED.nodes.registerType

        this.properties = properties || {};
        this.init(config);
    }

    // might not a good idea to run this after handlers have been set up as each of the properties will be set in turn, triggering the handlers
    init (config) {
        let configs = Object.keys(this.properties);
        for (let c of configs) {
            let property = this.properties[c];
            if (!property) {
                continue;
            }
            if(config.hasOwnProperty(c)){
                this.set(c, config[c]);
            } else if (property.hasOwnProperty('value')) {
                this.set(c, property.value);
            }
        }
    }

    input (msg) {
        this.inputProperties(msg);
        this.inputPayload(msg);
    }

    inputProperties (msg) {
        for (let property in this.properties) {
            if (msg.hasOwnProperty(property)) {
                let val = msg[property];
                this.set(property, val);
            }
        }
    }

    inputPayload (msg) {
        for (let property in this.properties) {
            if (msg.topic === property) {
                this.set(property, msg.payload);
            }
        }
    }

    // define a function to handle the setting of a property
    // if the property is undefined then apply the handler to all properties

    handle (handler, key, prepost) {
        if ((typeof handler) !== 'function') {
            this.node.warn('handler for ' + key + ' is not a function');
            return;
        }

        if (!['pre', 'post'].includes(prepost)) {
            prepost = '';
        }

        if (Array.isArray(key)) {
            for(let key_ of key){
                this.handle (handler, key_, prepost);
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

    set (key, val) {
        if (!Object.keys(this.properties).includes(key)) {
            this.node.warn(key + ' is not a property');
            return;
        }

        const property = this.properties[key];

        for (let handlerprop of ['prehandler', 'handler', 'posthandler']) {
            if ((typeof property[handlerprop]) === 'function') {
                property[handlerprop](val, key, this.node);
            } else if ((typeof this[handlerprop]) === 'function') {
                this[handlerprop](val, key, this.node);
            } else {
                if (handlerprop === 'handler') {
                    this.node[key] = val;
                }
            }
        }
    }
}

module.exports = { NodeRedProperties };
