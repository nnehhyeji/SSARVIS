package com.ssafy.ssarvis.bussinesscard.repository;

import com.ssafy.ssarvis.bussinesscard.entity.BusinessCard;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessCardRepository extends JpaRepository<BusinessCard, Long> {

}
