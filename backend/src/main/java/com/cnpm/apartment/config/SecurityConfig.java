package com.cnpm.apartment.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Cấu hình Spring Security.
 *
 * LƯU Ý cho nhóm: File này có thể cần được đồng bộ với module
 * User/Auth (Trần Tuấn Anh). Nếu nhóm dùng chung 1 SecurityConfig
 * thì chỉ cần giữ 1 file này trong project chính.
 *
 * Hiện tại đang để tạm thời permit all để dev nhanh.
 * Khi integrate JWT từ Trần Tuấn Anh thì bỏ comment phần JwtFilter.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    // Inject JwtAuthFilter từ module Auth của Trần Tuấn Anh khi sẵn sàng
    // private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Tắt CSRF (REST API dùng JWT, không cần CSRF)
            .csrf(AbstractHttpConfigurer::disable)

            // Cấu hình CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Stateless session (dùng JWT)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Phân quyền URL
            .authorizeHttpRequests(auth -> auth
                // Cho phép tất cả trong khi dev (TẠM THỜI)
                // TODO: Xóa dòng dưới khi tích hợp JWT từ module Auth
                .anyRequest().permitAll()

                // Khi tích hợp JWT, thay bằng:
                // .requestMatchers("/api/auth/**").permitAll()
                // .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // .requestMatchers("/api/payments/**").hasAnyRole("ADMIN", "ACCOUNTANT")
                // .requestMatchers("/api/receipts/**").hasAnyRole("ADMIN", "ACCOUNTANT")
                // .requestMatchers("/api/statistics/**").hasAnyRole("ADMIN", "ACCOUNTANT")
                // .requestMatchers("/api/reports/**").hasAnyRole("ADMIN", "ACCOUNTANT")
                // .anyRequest().authenticated()
            );

            // Khi tích hợp JWT, bỏ comment dòng dưới:
            // .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Cho phép ReactJS dev server (port 3000 hoặc 5173)
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
