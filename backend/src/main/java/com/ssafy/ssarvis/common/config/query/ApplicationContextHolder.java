package com.ssafy.ssarvis.common.config.query;

import jakarta.annotation.Nonnull;
import lombok.Getter;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

@Component
public class ApplicationContextHolder implements ApplicationContextAware {

    @Getter
    private static ApplicationContext context;

    @Override
    public void setApplicationContext(@Nonnull ApplicationContext applicationContext) throws BeansException {
        context = applicationContext;
    }

    public static <T> T getBean(Class<T> beanClass) {
        if (context == null) throw new IllegalStateException("ApplicationContext 아직 초기화 안됨");
        return context.getBean(beanClass);
    }

}