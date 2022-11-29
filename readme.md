## readme.md

```
actions:
  pre-deploy:
    - plugin: use-qualifier-deploy-fc
      args:
        qualifier: 1
        use-qualifier-config: true
        use-qualifier-code: true
        code-uri: /tmp/xxx # 代码的地址默认为 pwd
```
