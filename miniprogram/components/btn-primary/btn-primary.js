Component({
  properties: {
    disabled: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onTap(e) {
      if (this.properties.disabled) return;
      this.triggerEvent('tap', e.detail);
    }
  }
})
