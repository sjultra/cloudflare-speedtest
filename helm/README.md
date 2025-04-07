```
helm package speedtest-chart

```


```
helm install speedtest speedtest-chart-0.1.0.tgz --create-namespace --namespace speedtest
```