---
layout: post
title:  Spring 容器的实现原理
date:   2023-05-19 10:00:00 +8:00
description: Spring 容器的实现原理
tags: Java Spring 
categories: 框架
giscus_comments: true
---

Spring 是后端研发最常用的框架，而 IOC 容器则是 Spring 框架中使用最多的功能，也是 Spring 所有功能的基础。今天简单梳理一下 Spring 容器的一些实现原理，网上有很多资料对 Spring 容器的说明陷入了细节的纠缠中，没能从全局的角度理解容器。我尝试按照自己的理解说明一下。

# 什么是容器？

首先我们需要明确，Spring 的容器究竟是什么概念。从应用层面看，我们可以把 Spring 提供的 `ApplicationContext` 接口的具体实现当作容器的实例。因为我们在代码中经常这样使用：
``` java
Object bean = applicationContext.getBean("beanName");
```
通过名称获取容器中对应的 bean。这种用法让你想到了 java 中的什么 API ？是不是跟集合的使用有些类似？
``` java
Map<String, Object> objMap;
Object obj = objMap.get("objName");
```
那么，Spring 底层是不是也是用 Map 来实现容器的功能呢？我们可以看一下对应的代码实现。无论是基于注解的 `AnnotationConfigApplicationContext` 或者基于 XML 配置文件的 `ClassPathXmlApplicationContext`，两者的 `getBean` 方法都继承自 `AbstractApplicationContext`：
``` java
@Override  
public Object getBean(String name) throws BeansException {  
   assertBeanFactoryActive();  
   return getBeanFactory().getBean(name);  
}
```
可以看到，获取 bean 对象的具体操作委托给了 `BeanFactory` 对象。`BeanFactory` 又是什么组件？它和 `ApplicationContext` 的关系是什么？

我们首先了解一下这两个接口整体上的继承关系：

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/ApplicationContext.png" class="img-fluid rounded z-depth-1" zoomable=true%}
    </div>
</div>
<div class="caption">
    BeanFactory 和 ApplicationContext 的继承关系
</div>

具体的细节这里不展开，只简单介绍一下接口的大概作用：

- BeanFactory 是支持 IOC 容器的顶级接口，它提供了通过名称获取 bean 对象的基本操作。
- AliasRegistry 及其子接口提供了向容器注册 bean 对象的描述对象（BeanDefinition）的操作。
- SingletonBeanRegistry 提供了向容器注册 bean 对象的操作。
- ApplicationContext 是对 BeanFactory 做的扩展。它在 IOC 容器的基础上提供了国际化、配置初始化、容器继承等功能，作为应用上下文使用，是业务代码和框架进行交互的桥梁。

这里我们抛开其他细节，看一下 `BeanFactory` 的默认实现类 `DefaultListableBeanFactory` 是如何支持通过名称获取 bean 对象的：
``` java
@Override  
public <T> T getBean(Class<T> requiredType, @Nullable Object... args) throws BeansException {  
   Assert.notNull(requiredType, "Required type must not be null");  
   Object resolved = resolveBean(ResolvableType.forRawClass(requiredType), args, false);  
   if (resolved == null) {  
      throw new NoSuchBeanDefinitionException(requiredType);  
   }  
   return (T) resolved;  
}
```
这个方法进一步调用了 `resolveBean` 方法：
``` java
private <T> T resolveBean(ResolvableType requiredType, @Nullable Object[] args, boolean nonUniqueAsNull) { 
    // 先从当前容器中获取
   NamedBeanHolder<T> namedBean = resolveNamedBean(requiredType, args, nonUniqueAsNull);  
   if (namedBean != null) {  
      return namedBean.getBeanInstance();  
   }  
   // 如果找不到，就从父容器中获取
   // ......
}
```

在 `resolveNamedBean` 方法中，首先解析 bean 对象的名称，然后调用了 `AbstractBeanFactory` 中的 `getBean(String name)` 方法：
```java
@Override  
public Object getBean(String name) throws BeansException {  
   return doGetBean(name, null, null, false);  
}
```

方法 `doGetBean` 是初始化 bean 对象的核心方法，它会初始化对应的 bean 对象，以及对象的依赖。这里的逻辑比较复杂，我们只看获取对象的部分
```java 
protected <T> T doGetBean(  
      String name, @Nullable Class<T> requiredType, @Nullable Object[] args, boolean typeCheckOnly)  
      throws BeansException {  
  
   String beanName = transformedBeanName(name);  
   Object beanInstance;  
  
   // Eagerly check singleton cache for manually registered singletons.  
   Object sharedInstance = getSingleton(beanName);
   // ......
}
```

再查看 `getSingleton(String name)` 方法，这个方法定义在 `AbstractBeanFactory`  的父类 `DefaultSingletonBeanRegistry` 中，最终我们会发现单例的 bean 对象放在这里：
```java
/** Cache of singleton objects: bean name to bean instance. */  
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);
```

可以看到，Spring 底层确实是通过 Map 来支持对象的检索的，key 就是 bean 的名称，value 就是对应的 bean 对象。

# Spring 容器如何初始化

这里分析一下 `ApplicationContext` 的初始化。容器初始化的核心方法是 `AbstractApplicationContext.refresh()` 。