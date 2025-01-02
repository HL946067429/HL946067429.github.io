<template>
  <div>
    <Navbar />
    <slot />
    <MyFooter />
  </div>
</template>

<script>
import MyFooter from '@components/MyFooter.vue';

export default {
  components: {
    MyFooter,
  },
};
</script>