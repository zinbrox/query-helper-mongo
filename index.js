class MongoQueryBuilder {
    constructor() {
        this.filter = {};
        this.update = {};
        this.options = {};
        this.arrayFiltersCount = 1;
        this.query = [
            this.filter,
            this.update,
            this.options
        ];
    }

    where(key, value) {
        this.filter[key] = value;
    }

    whereAll(updates = {}) {
        for (const key in updates) {
            this.filter[key] = updates[key];
        }
    }

    and(key, value) {
        if (!this.filter['$and']) {
            this.filter['$and'] = [];
        }
        this.filter['$and'].push({
            [key]: value
        });
    }

    in(key, values) {
        this.filter[key] = {
            $in: values
        };
    }

    nin(key, values) {
        this.filter[key] = {
            $nin: values
        };
    }

    exists(key, value = true) {
        this.filter[key] = {
            $exists: value
        };
    }

    gt(key, value) {
        this.filter[key] = {
            $gt: value
        };
    }

    gte(key, value) {
        this.filter[key] = {
            $gte: value
        };
    }

    lt(key, value) {
        this.filter[key] = {
            $lt: value
        };
    }

    lte(key, value) {
        this.filter[key] = {
            $lte: value
        };
    }

    regex(key, pattern, options = '') {
        this.filter[key] = {
            $regex: pattern,
            $options: options
        };
    }

    inc(key, value) {
        if (!this.update['$inc']) {
            this.update['$inc'] = {};
        }
        this.update['$inc'][key] = value;
    }

    dec(key, value) {
        if (!this.update['$inc']) {
            this.update['$inc'] = {};
        }
        this.update['$inc'][key] = -value;
    }

    clear() {
        this.filter = {};
        this.update = {};
        this.options = {};
    }

    paginate(limit, offset) {
        this.options.limit = limit;
        this.options.skip = offset;
    }

    sort(key, order = 1) {
        this.options.sort = {
            [key]: order
        };
    }

    setDefaultUpdate() {
        if (!this.update['$set']) {
            this.update['$set'] = {};
        }
        if (!this.update['$inc']) {
            this.update['$inc'] = {};
        }
    }
    setDefaultArrayFilter() {
        if (!this.options.arrayFilters) {
            this.options.arrayFilters = [{}];
        }
    }

    checkIfArrayFilterExists(element, field, identifier) {
        let exists = false;

        for (const elem in element) {
            if (elem != identifier) {
                const field_to_update = `${field}$[element${this.arrayFiltersCount}].${elem}`.replace(/\.\$\[element\d+\]/, '');
                const field_components = field_to_update.split('.');

                for (const key of Object.keys(this.update['$set'])) {
                    const key_components = key.split('.');
                    if (field_components.every(component => key_components.includes(component))) {
                        return true;
                    }
                }
            }
        }
        return exists;
    }

    /**
     *
     * @param {Object} element object element with updated values
     * @param {String} field location of the array in the document
     * @param {*} identifier field in the element which uniquely identifies the element
     */
    createArrayFilterFromObject(element, field, identifier, condition = {}) {
        this.setDefaultUpdate();
        this.setDefaultArrayFilter();

        const unique_element = `element${this.arrayFiltersCount}.${identifier}`;
        if (Object.keys(condition).length != 0) {
            this.options.arrayFilters[0][unique_element] = condition;
        } else {
            const identifier_value = element[identifier];
            if (!identifier_value) {
                throw new Error('Identifier not found in passed arrayFilter element');
            }

            this.options.arrayFilters[0][unique_element] = identifier_value;
        }
        if (field && field.length > 0) {
            field += ".";
        }

        if (this.checkIfArrayFilterExists(element, field, identifier)) {
            throw new Error("ArrayFilters are mutually, exclusive, trying to update the same field multiple times");
        }

        for (const elem in element) {
            if (elem != identifier) {
                this.update['$set'][`${field}$[element${this.arrayFiltersCount}].${elem}`] = element[elem];
            }
        }
        this.arrayFiltersCount++;
    }

    createNewArrayFilter(updates= []) {
        this.setDefaultUpdate();
        this.setDefaultArrayFilter();

        for (const update of updates) {
            if (!update.identifier) {
                throw new Error("Identifier not found in passed arrayFilter element");
            }
            const unique_element = `element${this.arrayFiltersCount}.${update.identifier}`;
            const identifier_value = update.condition;
            this.options.arrayFilters[0][unique_element] = update.condition;

            if (update.field && update.field.length > 0) {
                update.field += ".";
            }

            if (this.checkIfArrayFilterExists(update.updates, update.field, update.identifier)) {
                throw new Error("ArrayFilters are mutually, exclusive, trying to update the same field multiple times");
            }

            for (const elem in update.updates) {
                if (elem != update.identifier) {
                    this.update['$set'][`${update.field}$[element${this.arrayFiltersCount}].${elem}`] = update.updates[elem];
                }
            }

            this.arrayFiltersCount++;
        }
    }


}

module.exports = MongoQueryBuilder;