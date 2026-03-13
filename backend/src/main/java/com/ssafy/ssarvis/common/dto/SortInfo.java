package com.ssafy.ssarvis.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import org.springframework.data.domain.Page;

@JsonInclude(Include.NON_NULL)
public record SortInfo(
    String by,
    String direction
) {

    public static SortInfo of(Page<?> page) {
        if (page.getSort().isUnsorted() || page.getSort().isEmpty()) {
            return null;
        }

        return page.getSort().stream()
            .findFirst()
            .map(order -> new SortInfo(order.getProperty(), order.getDirection().name()))
            .orElse(null);
    }
}
