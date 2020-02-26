function statWidget(object, property, parentNode, renderer) {
    let value = object[property];

    let domNode = renderer(value);
    parentNode.appendChild(domNode);

    const update = () => {
        const newNode = renderer(value);
        parentNode.replaceChild(newNode, domNode);
        domNode = newNode;
    };

    Object.defineProperty(object, property, {
        get: () => value,
        set: (newValue) => {
            if (newValue === value)
                return;
            value = newValue;
            update();
        }
    });
}
